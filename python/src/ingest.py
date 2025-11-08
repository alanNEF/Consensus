"""
Bill ingestion script: pulls bills, generates embeddings, and upserts to Supabase (pgvector)
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from typing import List, Dict, Any
import json


# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")
DATABASE_URL = os.getenv("DATABASE_URL")

# Check if required env vars are set
if not SUPABASE_URL or SUPABASE_URL == "replace_me":
    print("⚠️  SUPABASE_URL not configured. Using mock mode.")
    SUPABASE_URL = None

if not SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY == "replace_me":
    print("⚠️  SUPABASE_SERVICE_ROLE_KEY not configured. Using mock mode.")
    SUPABASE_SERVICE_ROLE_KEY = None

if not OPENAI_API_KEY or OPENAI_API_KEY == "replace_me":
    print("⚠️  OPENAI_API_KEY not configured. Using mock embeddings.")
    OPENAI_API_KEY = None



class BillProcessor:
    """Consolidated bill processor that scrapes, formats, and inserts bills."""
    
    BASE_URL = "https://api.congress.gov/v3"
    
    def __init__(self, congress_api_key: Optional[str] = None, db_url: Optional[str] = None):
        """
        Initialize the bill processor.
        
        Args:
            congress_api_key: Congress.gov API key. If None, uses CONGRESS_API_KEY env var.
            db_url: Supabase database URL. If None, uses DATABASE_URL env var.
        """
        # Congress API setup
        self.congress_api_key = congress_api_key or os.getenv("CONGRESS_API_KEY") or "Xxk2c4mKRpiECQt4yZQ2p5yTvfzbexqePKQ5hWb3"
        if not self.congress_api_key:
            raise ValueError("Congress API key required. Set CONGRESS_API_KEY environment variable.")
        
        self.session = requests.Session()
        self.session.headers.update({
            "X-API-Key": self.congress_api_key
        })
        
        # Database setup
        self.db_url = db_url or os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
        if not self.db_url:
            raise ValueError("Database URL required. Set DATABASE_URL or SUPABASE_DB_URL environment variable.")
        
        self.db_conn = None
    
    def get_current_congress_number(self) -> int:
        """Calculate the current Congress number based on the year."""
        current_year = datetime.now().year
        return ((current_year - 1789) // 2) + 1
    
    def get_bills(self, congress: Optional[int] = None, bill_type: str = "all") -> List[Dict]:
        """Retrieve all bills for a given Congress."""
        if congress is None:
            congress = self.get_current_congress_number()
        
        print(f"Fetching bills for the {congress}th Congress...")
        
        all_bills = []
        offset = 0
        limit = 250
        page = 1
        
        while True:
            try:
                if bill_type == "all":
                    url = f"{self.BASE_URL}/bill/{congress}"
                else:
                    url = f"{self.BASE_URL}/bill/{congress}/{bill_type}"
                
                params = {
                    "limit": limit,
                    "offset": offset,
                    "format": "json"
                }
                
                print(f"Fetching page {page} (offset: {offset})...")
                response = self.session.get(url, params=params)
                response.raise_for_status()
                
                data = response.json()
                bills = data.get("bills", [])
                if not bills:
                    break
                
                all_bills.extend(bills)
                print(f"Retrieved {len(bills)} bills (total: {len(all_bills)})")
                
                pagination = data.get("pagination", {})
                next_offset = pagination.get("next")
                
                if next_offset is None or next_offset == offset:
                    break
                
                offset = next_offset
                page += 1
                time.sleep(0.5)
                
            except requests.exceptions.RequestException as e:
                print(f"Error fetching bills: {e}")
                if hasattr(e, 'response') and e.response and e.response.status_code == 429:
                    print("Rate limited. Waiting 60 seconds...")
                    time.sleep(60)
                    continue
                break
        
        print(f"\nTotal bills retrieved: {len(all_bills)}")
        return all_bills
    
    def get_bill_text(self, congress: int, bill_type: str, bill_number: str) -> Optional[str]:
        """Retrieve the formatted text of a specific bill."""
        try:
            url = f"{self.BASE_URL}/bill/{congress}/{bill_type.lower()}/{bill_number}/text"
            params = {"format": "json"}
            
            response = self.session.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            text_versions = data.get("textVersions", [])
            
            formatted_text_url = None
            for version in text_versions:
                formats = version.get("formats", [])
                for fmt in formats:
                    format_type = fmt.get("type", "").lower()
                    if format_type == "formatted text":
                        formatted_text_url = fmt.get("url")
                        if formatted_text_url:
                            break
                if formatted_text_url:
                    break
            
            if not formatted_text_url:
                for version in text_versions:
                    formats = version.get("formats", [])
                    for fmt in formats:
                        format_type = fmt.get("type", "").lower()
                        if "pdf" not in format_type and "xml" not in format_type:
                            formatted_text_url = fmt.get("url")
                            if formatted_text_url:
                                break
                    if formatted_text_url:
                        break
            
            if not formatted_text_url:
                return None
            
            text_response = self.session.get(formatted_text_url)
            text_response.raise_for_status()
            
            return text_response.text
            
        except requests.exceptions.RequestException:
            return None
    
    def get_bill_sponsors(self, congress: int, bill_type: str, bill_number: str) -> List[str]:
        """
        Retrieve sponsors and cosponsors for a bill with their party affiliations.
        
        Returns:
            List of strings in format "Name (Party)"
        """
        sponsors_list = []
        
        try:
            # Get bill details for sponsors
            url = f"{self.BASE_URL}/bill/{congress}/{bill_type.lower()}/{bill_number}"
            params = {"format": "json"}
            
            response = self.session.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            bill = data.get("bill", {})
            
            # Get sponsors
            sponsors = bill.get("sponsors", [])
            for sponsor in sponsors:
                name = sponsor.get("fullName", "")
                party = sponsor.get("party", "")
                if name and party:
                    # Extract just the name part (remove [R-OK-4] style suffix if present)
                    # fullName format: "Rep. Cole, Tom [R-OK-4]"
                    if "[" in name:
                        name = name.split("[")[0].strip()
                    # Remove title prefix (Rep., Sen., etc.)
                    if "." in name and " " in name:
                        name = name.split(".", 1)[1].strip()
                    sponsors_list.append(f"{name} ({party})")
                elif name:
                    # Clean name even without party
                    if "[" in name:
                        name = name.split("[")[0].strip()
                    if "." in name and " " in name:
                        name = name.split(".", 1)[1].strip()
                    sponsors_list.append(name)
            
            # Get cosponsors
            cosponsors_url = f"{self.BASE_URL}/bill/{congress}/{bill_type.lower()}/{bill_number}/cosponsors"
            cosponsors_response = self.session.get(cosponsors_url, params=params)
            
            if cosponsors_response.status_code == 200:
                cosponsors_data = cosponsors_response.json()
                cosponsors = cosponsors_data.get("cosponsors", [])
                
                for cosponsor in cosponsors:
                    # Check if cosponsor was withdrawn
                    if cosponsor.get("isWithdrawn") == "Y":
                        continue
                    
                    name = cosponsor.get("fullName", "")
                    party = cosponsor.get("party", "")
                    if name and party:
                        # Extract just the name part
                        if "[" in name:
                            name = name.split("[")[0].strip()
                        # Remove title prefix (Rep., Sen., etc.)
                        if "." in name and " " in name:
                            name = name.split(".", 1)[1].strip()
                        sponsors_list.append(f"{name} ({party})")
                    elif name:
                        # Clean name even without party
                        if "[" in name:
                            name = name.split("[")[0].strip()
                        if "." in name and " " in name:
                            name = name.split(".", 1)[1].strip()
                        sponsors_list.append(name)
            
        except requests.exceptions.RequestException:
            pass
        
        return sponsors_list
    
    def get_all_bill_types(self, congress: Optional[int] = None) -> List[Dict]:
        """Retrieve all bills of all types for a given Congress."""
        if congress is None:
            congress = self.get_current_congress_number()
        
        bill_types = ["hr", "s", "hjres", "sjres", "hconres", "sconres", "hres", "sres"]
        all_bills = []
        
        print(f"Fetching all bill types for the {congress}th Congress...\n")
        
        for bill_type in bill_types:
            print(f"\n--- Fetching {bill_type.upper()} bills ---")
            bills = self.get_bills(congress=congress, bill_type=bill_type)
            all_bills.extend(bills)
            time.sleep(1)
        
        # Fetch text and sponsors for each bill
        if all_bills:
            print(f"\n--- Fetching bill text and sponsors for {len(all_bills)} bills ---")
            for i, bill in enumerate(all_bills, 1):
                bill_type = bill.get("type", "").lower()
                bill_number = bill.get("number", "")
                
                if bill_type and bill_number:
                    if i % 10 == 0:
                        print(f"Fetching data for bill {i}/{len(all_bills)}...")
                    
                    # Fetch text
                    bill_text = self.get_bill_text(congress, bill_type, bill_number)
                    bill["text"] = bill_text
                    
                    # Fetch sponsors
                    sponsors = self.get_bill_sponsors(congress, bill_type, bill_number)
                    bill["sponsors"] = sponsors
                    
                    time.sleep(0.4)  # Slightly longer delay to be respectful to API
            
            print(f"Completed fetching text and sponsors for all bills.")
        
        return all_bills
    
    def clean_html_text(self, html_text: str) -> str:
        """Remove HTML tags and formatting from bill text."""
        if not html_text or not isinstance(html_text, str):
            return ""
        
        # Decode HTML entities
        text = html.unescape(html_text)
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Clean up whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            cleaned_line = re.sub(r'[ \t]+', ' ', line.strip())
            cleaned_lines.append(cleaned_line)
        
        text = '\n'.join(cleaned_lines)
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = text.strip()
        
        return text
    
    def format_bills(self, bills: List[Dict]) -> List[Dict]:
        """Format bill text by removing HTML."""
        print(f"\n--- Formatting text for {len(bills)} bills ---")
        
        processed_count = 0
        for bill in bills:
            bill_text = bill.get('text')
            
            if bill_text and isinstance(bill_text, str):
                is_html = '<html>' in bill_text.lower() or '<body>' in bill_text.lower()
                if is_html:
                    cleaned_text = self.clean_html_text(bill_text)
                    bill['text'] = cleaned_text
                    processed_count += 1
        
        print(f"✓ Formatted {processed_count} bills")
        return bills
    
    def get_bill_id(self, bill: Dict) -> str:
        """Generate a unique ID for a bill."""
        congress = bill.get('congress', '')
        bill_type = bill.get('type', '')
        bill_number = bill.get('number', '')
        return f"{congress}_{bill_type}_{bill_number}"
    
    def get_date(self, bill: Dict) -> str:
        """Get the date from updateDate or latestAction.actionDate."""
        date_str = bill.get('updateDate')
        if date_str:
            return date_str
        
        latest_action = bill.get('latestAction', {})
        if isinstance(latest_action, dict):
            date_str = latest_action.get('actionDate')
            if date_str:
                return date_str
        
        return datetime.now().strftime('%Y-%m-%d')
    
    def get_status(self, bill: Dict) -> str:
        """Get the status from latestAction.text."""
        latest_action = bill.get('latestAction', {})
        if isinstance(latest_action, dict):
            status_text = latest_action.get('text', '')
            if status_text:
                return status_text
        return 'Unknown'
    
    def get_origin(self, bill: Dict) -> str:
        """Get the origin chamber."""
        origin = bill.get('originChamber', '')
        if not origin:
            origin = bill.get('originChamberCode', '')
        if not origin:
            bill_type = bill.get('type', '').upper()
            if bill_type.startswith('H'):
                origin = 'House'
            elif bill_type.startswith('S'):
                origin = 'Senate'
            else:
                origin = 'Unknown'
        return origin
    
    def connect_db(self):
        """Connect to the database."""
        try:
            self.db_conn = psycopg2.connect(self.db_url)
            print("✓ Connected to database")
        except Exception as e:
            print(f"Error connecting to database: {e}")
            raise
    
    def create_table(self):
        """Create the bills table if it doesn't exist."""
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS bills (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          summary_key TEXT,
          date DATE NOT NULL,
          status TEXT NOT NULL,
          origin TEXT NOT NULL,
          url TEXT NOT NULL,
          sponsors TEXT[] NOT NULL,
          bill_text TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
        
        with self.db_conn.cursor() as cur:
            cur.execute(create_table_sql)
        self.db_conn.commit()
        print("✓ Table created/verified")
    
    def insert_bills(self, bills: List[Dict]):
        """Insert bills into the database."""
        print(f"\n--- Inserting {len(bills)} bills into database ---")
        
        insert_sql = """
        INSERT INTO bills (id, title, summary_key, date, status, origin, url, sponsors, bill_text)
        VALUES %s
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          summary_key = EXCLUDED.summary_key,
          date = EXCLUDED.date,
          status = EXCLUDED.status,
          origin = EXCLUDED.origin,
          url = EXCLUDED.url,
          sponsors = EXCLUDED.sponsors,
          bill_text = EXCLUDED.bill_text,
          updated_at = NOW();
        """
        
        values = []
        inserted_count = 0
        skipped_count = 0
        
        for bill in bills:
            try:
                bill_id = self.get_bill_id(bill)
                title = bill.get('title', 'Untitled')
                summary_key = None
                date = self.get_date(bill)
                status = self.get_status(bill)
                origin = self.get_origin(bill)
                url = bill.get('url', '')
                sponsors = bill.get('sponsors', [])  # Get sponsors from bill data
                bill_text = bill.get('text', '')
                
                if not bill_id or not title or not date or not status or not origin or not url:
                    skipped_count += 1
                    continue
                
                values.append((
                    bill_id,
                    title,
                    summary_key,
                    date,
                    status,
                    origin,
                    url,
                    sponsors,
                    bill_text
                ))
                inserted_count += 1
                
            except Exception as e:
                print(f"Error processing bill {bill.get('type', '?')} {bill.get('number', '?')}: {e}")
                skipped_count += 1
                continue
        
        # Batch insert
        if values:
            with self.db_conn.cursor() as cur:
                execute_values(cur, insert_sql, values)
            self.db_conn.commit()
            print(f"✓ Inserted {inserted_count} bills")
            print(f"✗ Skipped {skipped_count} bills")
        else:
            print("No bills to insert")
    
    def process_all(self, congress: Optional[int] = None):
        """Run the complete process: scrape, format, and insert."""
        try:
            # Step 1: Scrape bills
            print("=" * 60)
            print("STEP 1: Scraping bills from Congress.gov API")
            print("=" * 60)
            bills = self.get_all_bill_types(congress=congress)
            
            # Step 2: Format text
            print("\n" + "=" * 60)
            print("STEP 2: Formatting bill text")
            print("=" * 60)
            bills = self.format_bills(bills)
            
            # Step 3: Insert into database
            print("\n" + "=" * 60)
            print("STEP 3: Inserting bills into Supabase")
            print("=" * 60)
            self.connect_db()
            self.create_table()
            self.insert_bills(bills)
            
            print("\n" + "=" * 60)
            print("✓ All steps completed successfully!")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n✗ Error: {e}")
            raise
        finally:
            if self.db_conn:
                self.db_conn.close()
                print("✓ Database connection closed")




def generate_embedding(text: str) -> List[float]:
    """Generate embedding for text using OpenAI"""
    if not OPENAI_API_KEY:
        # Return mock embedding
        print("  [MOCK] Generating mock embedding...")
        import random
        return [random.random() for _ in range(1536)]

    try:
        from openai import OpenAI

        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.embeddings.create(
            model=EMBED_MODEL,
            input=text,
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"  [ERROR] Failed to generate embedding: {e}")
        # Return mock embedding on error
        import random
        return [random.random() for _ in range(1536)]


def upsert_bill_embedding(bill_id: str, embedding: List[float]) -> bool:
    """Upsert bill embedding to Supabase"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print(f"  [MOCK] Would upsert embedding for bill {bill_id}")
        return False

    try:
        from supabase import create_client, Client

        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Convert embedding to string format for pgvector
        embedding_str = "[" + ",".join(map(str, embedding)) + "]"

        # Upsert to bill_embeddings table
        result = supabase.table("bill_embeddings").upsert(
            {
                "bill_id": bill_id,
                "embedding": embedding_str,  # pgvector expects string format
            },
            on_conflict="bill_id",
        ).execute()

        return True
    except Exception as e:
        print(f"  [ERROR] Failed to upsert embedding: {e}")
        return False


def ingest_bills():
    """Main ingestion function"""
    print("🚀 Starting bill ingestion...")
    print()

    # Fetch bills (mock for now)
    # TODO: Replace with actual Congress.gov API call or database query
    print("📥 Fetching bills...")
    bills = get_mock_bills()
    print(f"  Found {len(bills)} bills")
    print()

    # Process each bill
    for i, bill in enumerate(bills, 1):
        print(f"[{i}/{len(bills)}] Processing: {bill['title']}")

        # Generate text for embedding (combine title and summary_key)
        text = f"{bill['title']} {bill.get('summary_key', '')}"

        # Generate embedding
        print("  Generating embedding...")
        embedding = generate_embedding(text)

        # Upsert to database
        print("  Upserting to database...")
        success = upsert_bill_embedding(bill["id"], embedding)

        if success:
            print(f"  ✅ Successfully processed {bill['id']}")
        else:
            print(f"  ⚠️  Processed {bill['id']} (mock mode)")

        print()

    print("✅ Ingestion complete!")
    print()
    print("💡 Next steps:")
    print("   - Verify embeddings in Supabase dashboard")
    print("   - Run recommend.py to test similarity search")


if __name__ == "__main__":
    ingest_bills()


-- Seed data for development
-- This file inserts sample bills for testing

-- Sample bills
INSERT INTO bills (id, title, summary_key, date, status, origin, url, sponsors) VALUES
  (
    'hr1234-118',
    'Infrastructure Investment and Jobs Act',
    'infrastructure-jobs-2024',
    '2024-01-15',
    'Passed House',
    'House',
    'https://www.congress.gov/bill/118th-congress/house-bill/1234',
    ARRAY['Rep. Jane Smith', 'Rep. John Doe']
  ),
  (
    's5678-118',
    'Climate Action and Clean Energy Bill',
    'climate-action-2024',
    '2024-02-20',
    'In Committee',
    'Senate',
    'https://www.congress.gov/bill/118th-congress/senate-bill/5678',
    ARRAY['Sen. Alice Johnson', 'Sen. Bob Williams']
  ),
  (
    'hr9012-118',
    'Healthcare Access and Affordability Act',
    'healthcare-access-2024',
    '2024-03-10',
    'Passed Senate',
    'House',
    'https://www.congress.gov/bill/118th-congress/house-bill/9012',
    ARRAY['Rep. Carol Brown', 'Rep. David Lee']
  )
ON CONFLICT (id) DO NOTHING;

-- Sample bill summaries
INSERT INTO bill_summaries (bill_id, summary_text) VALUES
  (
    'hr1234-118',
    'This bill allocates $1.2 trillion over 10 years to improve roads, bridges, public transit, and broadband infrastructure across the United States. It aims to create millions of jobs and modernize the nation''s transportation and communication systems.'
  ),
  (
    's5678-118',
    'This legislation sets ambitious goals to reduce carbon emissions by 50% by 2030, invests in renewable energy sources, and provides tax incentives for clean energy technologies. It includes provisions for climate resilience and environmental justice.'
  ),
  (
    'hr9012-118',
    'This bill expands access to affordable healthcare by lowering prescription drug costs, extending Medicaid coverage, and providing subsidies for low-income families. It also includes mental health parity provisions and telehealth expansion.'
  )
ON CONFLICT DO NOTHING;


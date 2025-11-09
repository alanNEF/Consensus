import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import SearchClient from "./SearchClient";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const query = searchParams.q || "";

  return <SearchClient query={query} />;
}


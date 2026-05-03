import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/schuzky/$id")({
  component: MeetingDetailPage,
});

function MeetingDetailPage() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/schuzky">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Detail schůzky</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Schůzka</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            ID: {id}
            <p className="mt-2">Detail bude doplněn v dalším kroku.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

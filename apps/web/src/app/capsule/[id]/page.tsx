import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calendar, User, Bot, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCapsule } from "@pyla/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CapsulePageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({
  params,
}: CapsulePageProps): Promise<Metadata> {
  const supabase = await createClient();
  try {
    const capsule = await getCapsule(supabase as any, params.id);
    return { title: capsule.title };
  } catch {
    return { title: "Capsule Not Found" };
  }
}

export default async function CapsulePage({ params }: CapsulePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let capsule;
  try {
    capsule = await getCapsule(supabase as any, params.id);
  } catch (error) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10 px-4 md:px-6 max-w-4xl">
      <div className="mb-8">
        <Link 
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 -ml-4 mb-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start gap-4">
            <h1 className="text-3xl font-bold tracking-tight">{capsule.title}</h1>
            <Badge variant="secondary">v{capsule.version}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Created {format(new Date(capsule.createdAt), "PPP")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              <span>{capsule.messages.nodes.length} messages</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {capsule.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-8">
        {(capsule.goals.length > 0 || capsule.decisions.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {capsule.goals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {capsule.goals.map((goal, i) => (
                      <li key={i}>{goal}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {capsule.decisions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Decisions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {capsule.decisions.map((decision, i) => (
                      <li key={i}>{decision}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Conversation</h2>
          <div className="space-y-4">
            {capsule.messages.nodes.map((node) => {
              const participant = capsule.messages.participants.find(
                (p) => p.id === node.participantId
              );
              const isUser = participant?.role === "user";

              return (
                <div
                  key={node.id}
                  className={`flex flex-col gap-2 p-4 rounded-lg border ${
                    isUser ? "bg-muted/50" : "bg-card shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    {isUser ? (
                      <User className="h-3 w-3" />
                    ) : (
                      <Bot className="h-3 w-3" />
                    )}
                    <span>{participant?.name || participant?.role || "Unknown"}</span>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {node.content}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

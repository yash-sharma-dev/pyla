"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Search, Plus, MessageSquare } from "lucide-react";
import type { Capsule } from "@pyla/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CapsuleListProps {
  initialCapsules: Capsule[];
}

export default function CapsuleList({ initialCapsules }: CapsuleListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCapsules = initialCapsules.filter((capsule) =>
    capsule.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search capsules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Link 
          href={"/dashboard/new" as any}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Capsule
        </Link>
      </div>

      {filteredCapsules.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center border-dashed">
          <CardContent className="space-y-3">
            <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mx-auto">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">No capsules found</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                {searchQuery
                  ? `No capsules match "${searchQuery}". Try a different search.`
                  : "You haven't created any capsules yet. Start by capturing a conversation!"}
              </p>
            </div>
            {!searchQuery && (
              <Link 
                href={"/dashboard/new" as any}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                Create your first capsule
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCapsules.map((capsule) => (
            <Link key={capsule.id} href={`/capsule/${capsule.id}` as any}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="line-clamp-2 text-base group-hover:text-primary transition-colors">
                      {capsule.title}
                    </CardTitle>
                    <Badge variant="secondary" className="whitespace-nowrap">
                      v{capsule.version}
                    </Badge>
                  </div>
                  <CardDescription>
                    Updated {formatDistanceToNow(new Date(capsule.updatedAt), { addSuffix: true })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {capsule.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                    {capsule.tags.length > 3 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        +{capsule.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground border-t pt-3 flex justify-between">
                  <span>{capsule.messages.nodes.length} messages</span>
                  {capsule.orgId && <Badge variant="outline">Team</Badge>}
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

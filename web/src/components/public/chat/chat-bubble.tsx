"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import type { ReplyBlock } from "@/lib/chat/respond";
import type { StoredMessage } from "@/lib/chat/session";
import type { ChatKnowledge, KnowledgeIndex } from "@/lib/chat/types";
import { waLink } from "@/lib/whatsapp";
import { UnitChipCard } from "./unit-chip-card";

type Props = {
  message: StoredMessage;
  knowledge: ChatKnowledge;
  idx: KnowledgeIndex;
  onNavigate?: () => void;
  isLatest: boolean;
};

const BOT_BUBBLE = "self-start max-w-[88%] rounded-card rounded-bl-md bg-surface-2 px-3.5 py-2.5 text-[15px] leading-6 text-ink";
const USER_BUBBLE = "self-end max-w-[85%] rounded-card rounded-br-md bg-brand-600 px-3.5 py-2.5 text-[15px] leading-6 text-white";

/** Satu gelembung: tamu (kanan, brand) atau bot (kiri, abu) dengan blok teks/daftar/kartu unit/tautan/tombol WA. */
export function ChatBubble({ message, knowledge, idx, onNavigate }: Props) {
  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end">
        <p className={USER_BUBBLE}>{message.text}</p>
      </div>
    );
  }

  const { reply } = message;
  const handoffHref = reply.handoff ? waLink(knowledge.settings.whatsappNumber, reply.handoff.text) : null;
  return (
    <div className="flex flex-col items-start gap-2">
      {reply.blocks.map((block, index) => (
        <Block key={index} block={block} idx={idx} onNavigate={onNavigate} />
      ))}
      {handoffHref ? (
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <a
            href={handoffHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              track("chat_handoff", { intent: null, reason: "button" });
              track("whatsapp_redirect", { unit: null, saved: false, context: "general" });
            }}
          >
            <WhatsappIcon className="size-4" />
            Tanya admin via WhatsApp
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function Block({ block, idx, onNavigate }: { block: ReplyBlock; idx: KnowledgeIndex; onNavigate?: () => void }) {
  switch (block.type) {
    case "text":
      return <p className={BOT_BUBBLE}>{block.text}</p>;
    case "list":
      return (
        <ul className={`${BOT_BUBBLE} list-disc space-y-1 pl-7`}>
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    case "units": {
      const units = block.slugs.map((slug) => idx.unitBySlug.get(slug)).filter((unit) => unit !== undefined);
      if (!units.length) return null;
      return (
        <div className="flex w-full max-w-[92%] flex-col gap-2">
          {units.map((unit, position) => (
            <UnitChipCard key={unit.slug} unit={unit} idx={idx} position={position} onNavigate={onNavigate} />
          ))}
          {block.moreHref ? (
            <Link
              href={block.moreHref.href}
              onClick={onNavigate}
              className="inline-flex min-h-11 items-center gap-1 self-start px-1 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
            >
              {block.moreHref.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      );
    }
    case "link":
      return block.external ? (
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <a href={block.href} target="_blank" rel="noopener noreferrer">
            {block.label}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </Button>
      ) : (
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href={block.href} onClick={onNavigate}>
            {block.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      );
  }
}

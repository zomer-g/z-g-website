import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MilonEntryForm from "../MilonEntryForm";

export default async function EditMilonEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await prisma.milonEntry.findUnique({ where: { id } });
  if (!entry) notFound();

  return (
    <MilonEntryForm
      mode="edit"
      initialValues={{
        id: entry.id,
        slug: entry.slug,
        term: entry.term,
        vocalized: entry.vocalized,
        partOfSpeech: entry.partOfSpeech,
        etymology: entry.etymology ?? "",
        inflections: entry.inflections ?? "",
        domains: entry.domains,
        definitions: entry.definitions as { text: string; label: string }[],
        example: entry.example,
        order: entry.order,
        status: entry.status,
      }}
    />
  );
}

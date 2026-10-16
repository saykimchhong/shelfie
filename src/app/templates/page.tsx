import type { Metadata } from "next";
import { TemplateGallery } from "./TemplateGallery";

export const metadata: Metadata = {
  title: "Store templates",
  description: "Three layouts, any color, labels in Khmer, Sinhala, Tamil, Thai or English.",
};

export default function TemplatesPage() {
  return <TemplateGallery />;
}

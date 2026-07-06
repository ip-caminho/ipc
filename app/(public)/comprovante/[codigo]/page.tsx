import { ComprovanteForm } from "@features/retiro/components/ComprovanteForm";

export const metadata = { title: "Enviar comprovante — IPC" };

type Props = { params: Promise<{ codigo: string }> };

export default async function ComprovantePage({ params }: Props) {
  const { codigo } = await params;
  return <ComprovanteForm codigo={codigo} />;
}

type Entidade = {
  nomeCompleto?: string;
  cpf?: string;
  dataNascimento?: string;
  sexo?: string;
  estadoCivil?: string;
  nacionalidade?: string;
  whatsapp?: string;
  telefone?: string;
  email?: string;
  endereco?: {
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
  contatoEmergencia?: {
    nome?: string;
    telefone?: string;
    parentesco?: string;
  };
  profissao?: string;
  foto?: string;
};

type Membro = {
  dataBatismo?: string;
  dataMembresia?: string;
  formaAdmissao?: string;
};

interface FieldDef {
  key: string;
  label: string;
  check: (e: Entidade, m: Membro) => boolean;
}

export const REQUIRED_FIELDS: FieldDef[] = [
  { key: "nomeCompleto", label: "Nome completo", check: (e) => !!e.nomeCompleto },
  { key: "cpf", label: "CPF", check: (e) => !!e.cpf },
  { key: "dataNascimento", label: "Data de nascimento", check: (e) => !!e.dataNascimento },
  { key: "sexo", label: "Sexo", check: (e) => !!e.sexo },
  { key: "estadoCivil", label: "Estado civil", check: (e) => !!e.estadoCivil },
  { key: "nacionalidade", label: "Nacionalidade", check: (e) => !!e.nacionalidade },
  { key: "whatsapp", label: "WhatsApp", check: (e) => !!e.whatsapp },
  {
    key: "contatoSecundario",
    label: "Email ou telefone",
    check: (e) => !!(e.email || e.telefone),
  },
  {
    key: "endereco",
    label: "Endereco",
    check: (e) =>
      !!(e.endereco?.logradouro && e.endereco?.cidade && e.endereco?.estado && e.endereco?.cep),
  },
  {
    key: "contatoEmergencia",
    label: "Contato de emergencia",
    check: (e) =>
      !!(e.contatoEmergencia?.nome && e.contatoEmergencia?.telefone && e.contatoEmergencia?.parentesco),
  },
  { key: "profissao", label: "Profissao", check: (e) => !!e.profissao },
  { key: "foto", label: "Foto", check: (e) => !!e.foto },
  { key: "dataBatismo", label: "Data de batismo", check: (_e, m) => !!m.dataBatismo },
  { key: "dataMembresia", label: "Data de membresia", check: (_e, m) => !!m.dataMembresia },
  { key: "formaAdmissao", label: "Forma de admissao", check: (_e, m) => !!m.formaAdmissao },
];

const MESES_STALE = 6;
const MS_STALE = MESES_STALE * 30 * 24 * 60 * 60 * 1000;

export function calculateCompleteness(
  entidade: Entidade,
  membro: Membro,
  dadosIncertos: string[] = []
) {
  const incertosSet = new Set(dadosIncertos);
  const applicable = REQUIRED_FIELDS.filter((f) => !incertosSet.has(f.key));
  const total = applicable.length;
  if (total === 0) return { percentage: 100, filled: 0, total: 0, missing: [] };

  const missing: Array<{ key: string; label: string }> = [];
  let filled = 0;

  for (const field of applicable) {
    if (field.check(entidade, membro)) {
      filled++;
    } else {
      missing.push({ key: field.key, label: field.label });
    }
  }

  const percentage = Math.round((filled / total) * 100);
  return { percentage, filled, total, missing };
}

export function isStale(perfilAtualizadoEm: number | undefined, now: number = Date.now()) {
  if (!perfilAtualizadoEm) return true;
  return now - perfilAtualizadoEm > MS_STALE;
}

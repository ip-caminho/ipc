#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const csv = readFileSync(join(__dirname, "membros.csv"), "utf8");

// --- CSV Parser ---
function parseCSVLine(line) {
  const fields = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      fields.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  fields.push(field);
  return fields.map((f) => f.trim());
}

const lines = csv
  .replace(/\r\n/g, "\n")
  .split("\n")
  .filter((l) => l.trim());
const header = parseCSVLine(lines[0]);
const rows = lines.slice(1).map((l) => parseCSVLine(l));

const COL = {};
header.forEach((h, i) => {
  COL[h] = i;
});

// --- Cleaning functions ---

function cleanCPF(raw) {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 11) return undefined;
  return digits.slice(0, 11);
}

function cleanDate(raw) {
  if (!raw) return undefined;
  const match = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function cleanEstadoCivil(raw) {
  if (!raw) return undefined;
  const up = raw.toUpperCase();
  if (up.includes("CASADO")) return "CASADO";
  if (up.includes("SOLTEI") || up.includes("SOTEI")) return "SOLTEIRO";
  if (up.includes("DIVORCI")) return "DIVORCIADO";
  if (up.includes("VIUV")) return "VIUVO";
  if (up.includes("UNIÃO") || up.includes("UNIAO") || up.includes("ESTÁVEL"))
    return "UNIAO_ESTAVEL";
  return undefined;
}

function cleanSexo(raw) {
  if (!raw) return undefined;
  if (raw.toLowerCase().includes("masc")) return "M";
  if (raw.toLowerCase().includes("fem")) return "F";
  return undefined;
}

function cleanWhatsapp(telefone, waUrl) {
  if (waUrl) {
    const match = waUrl.match(/wa\.me\/(.+)/);
    if (match) {
      let num = match[1].replace(/[^\d]/g, "");
      // Fix double country code: "55+5511..." → "555511..." → strip first "55"
      if (num.length > 13 && num.startsWith("5555")) {
        num = num.slice(2);
      }
      if (num.length >= 10) {
        if (!num.startsWith("55")) num = "55" + num;
        return "+" + num;
      }
    }
  }
  if (telefone) {
    const digits = telefone.replace(/\D/g, "");
    if (digits.length >= 10) {
      const num = digits.startsWith("55") ? digits : "55" + digits;
      return "+" + num;
    }
  }
  return undefined;
}

function cleanNaturalidade(raw) {
  if (!raw) return undefined;
  raw = raw
    .trim()
    .replace(/\.$/, "")
    .trim();
  if (!raw) return undefined;

  // "Cidade/Estado - País"
  let match = raw.match(/^(.+?)\/([A-Za-z]{2})\s*-\s*(.+)$/);
  if (match)
    return {
      cidade: match[1].trim(),
      estado: match[2].trim().toUpperCase(),
      pais: match[3].trim(),
    };

  // "Cidade/Estado" (no country)
  match = raw.match(/^(.+?)\/([A-Za-z]{2})$/);
  if (match)
    return { cidade: match[1].trim(), estado: match[2].trim().toUpperCase(), pais: "Brasil" };

  // "Cidade - País"
  match = raw.match(/^(.+?)\s*-\s*(.+)$/);
  if (match)
    return { cidade: match[1].trim(), estado: "", pais: match[2].trim() };

  return { cidade: raw, estado: "", pais: "Brasil" };
}

function cleanFormacao(raw) {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (lower.includes("mestrado") || lower.includes("mestre")) return "MESTRADO";
  if (
    lower.includes("pós") ||
    lower.includes("pos") ||
    lower.includes("mba") ||
    lower.includes("mdiv")
  )
    return "POS_GRADUACAO";
  if (
    lower.includes("superior") ||
    lower.includes("licenciatura") ||
    lower.includes("bachar") ||
    lower.includes("engenharia") ||
    lower.includes("engenheiro") ||
    lower.includes("medicina") ||
    lower.includes("direito") ||
    lower.includes("economia") ||
    lower.includes("economista") ||
    lower.includes("pedagogia") ||
    lower.includes("publicidade") ||
    lower.includes("publicitári") ||
    lower.includes("nutrici") ||
    lower.includes("psicologia") ||
    lower.includes("psicólog") ||
    lower.includes("teologia") ||
    lower.includes("letras") ||
    lower.includes("cinema") ||
    lower.includes("design") ||
    lower.includes("administra") ||
    lower.includes("comunica") ||
    lower.includes("arquitetura") ||
    lower.includes("fisioterapia") ||
    lower.includes("finanç") ||
    lower.includes("marketing") ||
    lower.includes("farmac") ||
    lower.includes("contáb") ||
    lower.includes("estilista") ||
    lower.includes("moda")
  )
    return "SUPERIOR";
  if (lower.includes("médio") || lower.includes("medio")) return "MEDIO";
  if (lower.match(/\d+\s*ano/) || lower.includes("fundamental") || lower.includes("maternal"))
    return "FUNDAMENTAL";
  return undefined;
}

function cleanNacionalidade(raw) {
  if (!raw) return undefined;
  let clean = raw
    .trim()
    .replace(/\.$/, "")
    .trim();
  if (!clean) return undefined;
  const lower = clean.toLowerCase();
  if (lower.includes("brasil")) return "BRASILEIRA";
  if (lower.includes("paraguai")) return "PARAGUAIA";
  if (lower.includes("argentin")) return "ARGENTINA";
  if (
    lower.includes("coreano") ||
    lower.includes("coreana") ||
    lower.includes("sul-coreano") ||
    lower.includes("sul coreano")
  )
    return "SUL-COREANA";
  if (lower.includes("quirguiz")) return "QUIRGUIZ";
  if (lower.includes("chinês") || lower.includes("china")) return "CHINESA";
  return clean.toUpperCase();
}

function cleanStatus(raw) {
  if (!raw) return { entityStatus: "ATIVO", cargoEclesiastico: "MEMBRO_COMUNGANTE" };
  const lower = raw.toLowerCase();
  if (lower.includes("exclu") || lower.includes("transfer")) {
    return { entityStatus: "TRANSFERIDO", cargoEclesiastico: "MEMBRO_COMUNGANTE" };
  }
  if (lower.includes("não comungante") || lower.includes("nao comungante")) {
    return { entityStatus: "ATIVO", cargoEclesiastico: "MEMBRO_NAO_COMUNGANTE" };
  }
  return { entityStatus: "ATIVO", cargoEclesiastico: "MEMBRO_COMUNGANTE" };
}

function cleanEndereco(enderecoRaw, bairro, cidade, cep, complemento) {
  if (!enderecoRaw && !cidade) return undefined;

  let logradouro = (enderecoRaw || "").trim();
  let numero = "";

  // Extract number from end: "Rua X, 544" or "Rua X 544"
  const numMatch = logradouro.match(/[,\s]+(\d+\w?)\s*$/);
  if (numMatch) {
    numero = numMatch[1];
    logradouro = logradouro.replace(/[,\s]+\d+\w?\s*$/, "").trim();
  }

  if (!logradouro) return undefined;

  let cleanCep = (cep || "").replace(/\D/g, "");
  if (cleanCep.length === 8) {
    cleanCep = cleanCep.replace(/(\d{5})(\d{3})/, "$1-$2");
  } else {
    cleanCep = "";
  }

  const result = {
    logradouro,
    numero: numero || "S/N",
    bairro: (bairro || "").trim(),
    cidade: (cidade || "São Paulo").trim(),
    estado: "SP",
    cep: cleanCep,
  };

  const comp = (complemento || "").trim();
  if (comp) result.complemento = comp;

  return result;
}

function cleanRol(raw) {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (trimmed === "Principal") return "Principal";
  if (trimmed === "Separado") return "Separado";
  return undefined;
}

// --- Process rows ---

const membros = rows
  .map((row) => {
    const nome = (row[COL["Nome"]] || "").trim();
    if (!nome) return null;

    const { entityStatus, cargoEclesiastico } = cleanStatus(row[COL["Status"]]);

    return {
      nomeCompleto: nome,
      cpf: cleanCPF(row[COL["CPF"]]),
      rg: (row[COL["RG"]] || "").trim() || undefined,
      dataNascimento: cleanDate(row[COL["Data de nascimento"]]),
      sexo: cleanSexo(row[COL["Sexo"]]),
      estadoCivil: cleanEstadoCivil(row[COL["Estado Civil"]]),
      nacionalidade: cleanNacionalidade(row[COL["Nacionalidade"]]),
      naturalidade: cleanNaturalidade(row[COL["Natural"]]),
      pai: (row[COL["Pai"]] || "").trim() || undefined,
      mae: (row[COL["Mãe"]] || "").trim() || undefined,
      profissao: (row[COL["Profissão"]] || "").trim() || undefined,
      formacao: cleanFormacao(row[COL["Formação"]]),
      whatsapp: cleanWhatsapp(row[COL["Telefone"]], row[COL["Whatsapp (1)"]]),
      endereco: cleanEndereco(
        row[COL["Endereço"]],
        row[COL["Bairro"]],
        row[COL["Cidade"]],
        row[COL["CEP"]],
        row[COL["Complemento"]]
      ),
      entityStatus,
      rol: cleanRol(row[COL["Rol"]]),
      cargoEclesiastico,
    };
  })
  .filter(Boolean)
  // Remove undefined/null/empty values
  .map((m) => {
    const clean = {};
    for (const [k, v] of Object.entries(m)) {
      if (v !== undefined && v !== null && v !== "") {
        clean[k] = v;
      }
    }
    return clean;
  });

// Save to temp file
const output = JSON.stringify({ membros });
writeFileSync("/tmp/membros-import.json", output);
console.log(`Parsed ${membros.length} members. JSON saved to /tmp/membros-import.json`);
console.log(`JSON size: ${(output.length / 1024).toFixed(1)} KB`);

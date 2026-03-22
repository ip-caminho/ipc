import { mutation } from "../_generated/server";
import { v } from "convex/values";

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameWords(name: string): string[] {
  return normalize(name).split(" ").filter((w) => w.length > 1);
}

export const updatePhotos = mutation({
  args: {
    photos: v.array(
      v.object({
        name: v.string(),
        birthDate: v.optional(v.string()),
        photoUrl: v.string(),
      })
    ),
  },
  handler: async (ctx, { photos }) => {
    const entidades = await ctx.db.query("entidades").collect();

    const matched: string[] = [];
    const skipped: string[] = [];
    const seen = new Set<string>();

    for (const photo of photos) {
      if (!photo.photoUrl) {
        skipped.push(`${photo.name}: sem URL`);
        continue;
      }

      const inputNorm = normalize(photo.name);
      const inputWords = nameWords(photo.name);

      let bestMatch: (typeof entidades)[0] | null = null;
      let bestScore = 0;

      for (const ent of entidades) {
        if (!ent.nomeCompleto) continue;
        if (seen.has(ent._id)) continue;

        const dbNorm = normalize(ent.nomeCompleto);
        const dbWords = nameWords(ent.nomeCompleto);

        let score = 0;

        if (inputNorm === dbNorm) {
          score = 100;
        } else {
          const inputInDb = inputWords.filter((w) => dbWords.includes(w)).length;
          const dbInInput = dbWords.filter((w) => inputWords.includes(w)).length;
          const overlapRatio = Math.max(
            inputWords.length > 0 ? inputInDb / inputWords.length : 0,
            dbWords.length > 0 ? dbInInput / dbWords.length : 0
          );
          score = overlapRatio * 80;
        }

        // Birth date
        if (photo.birthDate && ent.dataNascimento) {
          if (photo.birthDate === ent.dataNascimento) {
            score += 20;
          } else {
            score -= 30;
          }
        }

        // Single-word input: require birth date match
        if (inputWords.length <= 1 && !(photo.birthDate && ent.dataNascimento && photo.birthDate === ent.dataNascimento)) {
          score = Math.min(score, 40);
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = ent;
        }
      }

      if (bestMatch && bestScore >= 60) {
        await ctx.db.patch(bestMatch._id, { foto: photo.photoUrl });
        seen.add(bestMatch._id);
        matched.push(`${photo.name} -> ${bestMatch.nomeCompleto} (${bestScore})`);
      } else {
        const reason = bestMatch
          ? `melhor: ${bestMatch.nomeCompleto} (${bestScore.toFixed(0)})`
          : "nenhum match";
        skipped.push(`${photo.name}: ${reason}`);
      }
    }

    return { matched: matched.length, skipped: skipped.length, matchedList: matched, skippedList: skipped };
  },
});

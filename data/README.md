# NyayaSaathi Legal Corpus

## ⚠️ Important: Corpus Verification Required

All chunks in `corpus.json` have `"verified": false`. **You must manually verify every chunk before deploying to production** using the official sources linked in `source_url`.

## How to Verify Chunks

For each chunk:
1. Visit the `source_url` (IndiaCode.nic.in, Ministry websites)
2. Find the exact section referenced in `section` field
3. Compare the `text` field to the actual statutory text
4. Update `"verified": true` once confirmed accurate
5. If the text was paraphrased (which most are), note it in a `"note"` field

## How to Add New Chunks

Each chunk must follow this schema:
```json
{
  "id": "unique-id-kebab-case",
  "act": "Full Official Name of Act, Year",
  "section": "Section X(Y)",
  "title": "Short descriptive title (used in search)",
  "text": "Accurate paraphrase or direct quote of the section",
  "source_url": "Official government URL",
  "language": "en",
  "verified": false,
  "keywords": ["search", "keywords", "for", "BM25"]
}
```

**Rules for text content:**
- Prefer direct quotes from official gazette/IndiaCode text
- If paraphrasing, be conservative and accurate
- Always include `source_url` pointing to the official government source
- Set `verified: false` until manually cross-checked
- Keep text under ~500 characters for optimal BM25 performance

## Official Sources

| Topic | Official URL |
|-------|-------------|
| RTI Act 2005 | https://www.indiacode.nic.in/handle/123456789/2065 |
| Consumer Protection Act 2019 | https://consumeraffairs.nic.in/consumer-protection-act-2019 |
| State Rent Control Acts | Check respective State Government portals |
| NALSA Legal Aid | https://nalsa.gov.in/ |

## Corpus Coverage (Current)

- ✅ RTI Act 2005: Filing (S.6), Timeline (S.7), Fees (S.6), First Appeal (S.19), Exemptions (S.8)
- ✅ Consumer Protection Act 2019: Consumer definition (S.2), Rights, Filing (S.34-35), Limitation (S.69), Unfair practices (S.2)
- ✅ Tenancy (General): Security deposit, Rent agreement, Eviction basics (marked as general guidance, state-wise variation noted)

## Roadmap for Corpus Expansion

- [ ] IPC/BNS sections on common offences (for awareness only)
- [ ] Labour law basics (PF, ESI, minimum wage)
- [ ] Motor Accidents Claims Tribunal process
- [ ] Land records and property registration
- [ ] Domestic Violence Act 2005
- [ ] SC/ST (PoA) Act for Dalit rights

import { Investor } from '@/types';

export interface ColumnMapping {
  firstName: string | null;
  lastName: string | null;
  linkedInUrl: string | null;
  description: string | null;
  location: string | null;
  seniority: string | null;
  title: string | null;
  industries: string | null;
  companyName: string | null;
  companyDescription: string | null;
  domain: string | null;
  email: string | null;
}

const FIELD_ALIASES: Record<string, string[]> = {
  firstName: ['first name', 'firstname', 'person first name', 'first'],
  lastName: ['last name', 'lastname', 'person last name', 'last'],
  linkedInUrl: ['linkedin', 'linkedin url', 'person linkedin', 'linkedin profile', 'profile url'],
  description: ['description', 'person description', 'bio', 'about', 'summary'],
  location: ['location', 'person location', 'city', 'address'],
  seniority: ['seniority', 'person seniority', 'level', 'person level'],
  title: ['title', 'person title', 'job title', 'role'],
  industries: ['industries', 'industry', 'sectors', 'ocean.io'],
  companyName: ['company', 'company name', 'organization'],
  companyDescription: ['company description', 'org description', 'company bio'],
  domain: ['domain', 'website', 'company website', 'domain name'],
  email: ['email', 'e-mail', 'contact email', 'person email'],
};

export function detectColumns(headers: string[]): { mapping: ColumnMapping; unmapped: string[] } {
  const mapping: ColumnMapping = {
    firstName: null, lastName: null, linkedInUrl: null, description: null,
    location: null, seniority: null, title: null, industries: null,
    companyName: null, companyDescription: null, domain: null, email: null,
  };
  const unmapped: string[] = [];
  const usedHeaders = new Set<string>();

  for (const field of Object.keys(mapping) as (keyof ColumnMapping)[]) {
    const aliases = FIELD_ALIASES[field] || [];
    for (const header of headers) {
      const normalized = header.toLowerCase().trim();
      if (aliases.some(a => normalized.includes(a)) && !usedHeaders.has(header)) {
        mapping[field] = header;
        usedHeaders.add(header);
        break;
      }
    }
  }

  for (const header of headers) {
    if (!usedHeaders.has(header)) unmapped.push(header);
  }

  return { mapping, unmapped };
}

export function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function mapRowToInvestor(row: Record<string, string>, mapping: ColumnMapping): Partial<Investor> {
  const get = (field: keyof ColumnMapping): string => {
    const header = mapping[field];
    return header ? (row[header] || '').trim() : '';
  };
  return {
    linkedInUrl: get('linkedInUrl'),
    firstName: get('firstName'),
    lastName: get('lastName'),
    description: get('description'),
    location: get('location'),
    seniority: get('seniority'),
    title: get('title'),
    industries: get('industries'),
    companyName: get('companyName'),
    companyDescription: get('companyDescription'),
    domain: get('domain'),
    email: get('email') || null,
  };
}
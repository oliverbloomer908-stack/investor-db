import { Investor } from '@/types';

export interface ColumnMapping {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
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
  firstName: ['first name', 'firstname', 'person first name', 'first', 'fname', 'given name', 'given_name', 'full name', 'fullname'],
  lastName: ['last name', 'lastname', 'person last name', 'last', 'lname', 'surname', 'family name', 'family_name', 'client last name'],
  displayName: ['person name'],
  linkedInUrl: ['linkedin', 'linkedin url', 'linkedin profile', 'linkedin link', 'profile', 'person linkedin', 'person linkedin url', 'linkedinid', 'li_url', 'linkedin_profile', 'person linkedin profile'],
  description: ['description', 'person description', 'bio', 'about', 'summary', 'person bio', 'bio_short'],
  location: ['location', 'person location', 'city', 'address', 'region', 'person location'],
  seniority: ['seniority', 'person seniority', 'level', 'seniority level', 'job level', 'c-level', 'executive level', 'person level', 'person seniority level'],
  title: ['title', 'person title', 'job title', 'job_title', 'position', 'role', 'designation', 'job_title'],
  industries: ['industries', 'industry', 'sectors', 'sector', 'category', 'focus', 'ocean.io', 'industries (ocean.io)', 'industries (third party)'],
  companyName: ['company', 'company name', 'organization', 'org', 'firm', 'employer', 'company organization', 'companyname', 'company keywords'],
  companyDescription: ['company description', 'org description', 'company bio', 'company about', 'companydescription'],
  domain: ['domain', 'website', 'company website', 'domain name', 'company website url', 'companywebsite'],
  email: ['email', 'e-mail', 'contact email', 'contact e-mail', 'email address', 'email_address', 'person email'],
};

export function detectColumns(headers: string[]): { mapping: ColumnMapping; unmapped: string[] } {
  const result = detectColumnsWithConfidence(headers);
  return { mapping: result.mapping, unmapped: result.unmapped };
}

export function detectColumnsWithConfidence(headers: string[]): {
  mapping: ColumnMapping;
  unmapped: string[];
  confidence: Record<keyof ColumnMapping, number>;
} {
  const mapping: ColumnMapping = {
    firstName: null, lastName: null, displayName: null, linkedInUrl: null, description: null,
    location: null, seniority: null, title: null, industries: null,
    companyName: null, companyDescription: null, domain: null, email: null,
  };
  const confidence: Record<keyof ColumnMapping, number> = {
    firstName: 0, lastName: 0, displayName: 0, linkedInUrl: 0, description: 0,
    location: 0, seniority: 0, title: 0, industries: 0,
    companyName: 0, companyDescription: 0, domain: 0, email: 0,
  };
  const unmapped: string[] = [];
  const usedHeaders = new Set<string>();

  for (const field of Object.keys(mapping) as (keyof ColumnMapping)[]) {
    const aliases = FIELD_ALIASES[field] || [];
    for (const header of headers) {
      const normalized = header.toLowerCase().trim();
      // Exact match — highest confidence, wins over substring
      const exactMatch = aliases.some(a => normalized === a.toLowerCase());
      // Substring match only when header is meaningfully longer than alias
      // (alias must be at least 5 chars shorter — prevents "person name" from matching "person last name")
      const substringMatch = aliases.some(a =>
        normalized.includes(a.toLowerCase()) && normalized.length - a.toLowerCase().length >= 5
      );

      if (exactMatch && !usedHeaders.has(header)) {
        mapping[field] = header;
        confidence[field] = 1.0;
        usedHeaders.add(header);
        break;
      } else if (substringMatch && !usedHeaders.has(header)) {
        mapping[field] = header;
        confidence[field] = 0.7;
        usedHeaders.add(header);
        break;
      }
    }
  }

  for (const header of headers) {
    if (!usedHeaders.has(header)) unmapped.push(header);
  }

  return { mapping, unmapped, confidence };
}

export function parseCSV(content: string): Record<string, string>[] {
  const lines = content.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
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
    displayName: get('displayName') || undefined,
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
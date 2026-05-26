import { describe, it, expect } from 'vitest';
import { parseCSV, detectColumns, mapRowToInvestor } from '@/lib/csv';

describe('csv', () => {
  it('parses a CSV string into rows', () => {
    const csv = `First Name,Last Name,LinkedIn,Location
John,Doe,https://linkedin.com/in/john,New York, NY
Jane,Smith,https://linkedin.com/in/jane,London, UK`;
    const rows = parseCSV(csv);
    expect(rows.length).toBe(2);
    expect(rows[0]['First Name']).toBe('John');
  });

  it('detects column mapping from headers', () => {
    const headers = ['First Name', 'LinkedIn URL', 'Location', 'Seniority'];
    const { mapping } = detectColumns(headers);
    expect(mapping.firstName).toBe('First Name');
    expect(mapping.linkedInUrl).toBe('LinkedIn URL');
    expect(mapping.location).toBe('Location');
  });

  it('maps a raw CSV row to investor fields', () => {
    const mapping = { firstName: 'First Name', linkedInUrl: 'LinkedIn', location: 'Location', lastName: null, description: null, seniority: null, title: null, industries: null, companyName: null, companyDescription: null, domain: null, email: null };
    const raw = { 'First Name': 'John', 'LinkedIn': 'https://linkedin.com/in/john', 'Location': 'NYC' };
    const investor = mapRowToInvestor(raw, mapping);
    expect(investor.firstName).toBe('John');
    expect(investor.linkedInUrl).toBe('https://linkedin.com/in/john');
  });

  it('handles unmapped columns gracefully', () => {
    const headers = ['Person Name', 'Some New Column', 'LinkedIn'];
    const { mapping, unmapped } = detectColumns(headers);
    expect(unmapped).toContain('Some New Column');
  });
});
export interface Investor {
  id?: number;
  linkedInUrl: string;
  firstName: string;
  lastName: string;
  description: string;
  location: string;
  seniority: string;
  title: string;
  industries: string;
  companyName: string;
  companyDescription: string;
  domain: string;
  email: string | null;
  meta?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Campaign {
  id?: number;
  name: string;
  raiseAmount?: string;
  stage?: string;
  sector?: string;
  thesis?: string[];
  createdAt?: string;
}
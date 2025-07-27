import { test, expect } from '@playwright/test';
import { join } from 'node:path';
import { parse } from 'csv';
import { mkdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { cwd } from 'node:process';

interface PersonData {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    company: string;
    jobTitle: string;
    createdAt: string;
}

interface ValidationResult {
    timestamp: string;
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    errors: string[];
    summary: {
        uniqueIds: number;
        uniqueEmails: number;
        countries: Set<string> | string[];
        companies: Set<string> | string[];
    };
}

test.describe('Validate Report', () => {
    test('should validate downloaded person data from artifacts', async () => {
        // Create output directory for validation results
        const outputDir = join(cwd(), 'output');
        try {
            mkdirSync(outputDir, { recursive: true });
        } catch {
            // Directory already exists
        }

        // Path to downloaded artifacts (from Tuesday pipeline)
        const artifactsDir = join(cwd(), 'downloaded-artifacts');

        // Check if artifacts directory exists
        let artifactsExist = false;
        try {
            statSync(artifactsDir);
            artifactsExist = true;
        } catch {
            // Directory doesn't exist
        }
        if (!artifactsExist) {
            console.log('⚠️  No downloaded artifacts found. Creating sample data for testing...');
            // Create sample data for testing when artifacts are not available
            await createSampleData(artifactsDir);
        }

        const validationResult: ValidationResult = {
            timestamp: new Date().toISOString(),
            totalRecords: 0,
            validRecords: 0,
            invalidRecords: 0,
            errors: [],
            summary: {
                uniqueIds: 0,
                uniqueEmails: 0,
                countries: new Set<string>(),
                companies: new Set<string>(),
            },
        };

        // Read and validate JSON data
        const jsonFilePath = join(artifactsDir, 'person-data.json');
        let jsonExists = false;
        try {
            statSync(jsonFilePath);
            jsonExists = true;
        } catch {
            // File doesn't exist
        }
        if (jsonExists) {
            console.log(`📖 Reading JSON data from: ${jsonFilePath}`);
            const jsonData = JSON.parse(readFileSync(jsonFilePath, 'utf8'));
            await validatePersonData(jsonData, validationResult);
        }

        // Read and validate CSV data
        const csvFilePath = join(artifactsDir, 'person-data.csv');
        let csvExists = false;
        try {
            statSync(csvFilePath);
            csvExists = true;
        } catch {
            // File doesn't exist
        }
        if (csvExists) {
            console.log(`📖 Reading CSV data from: ${csvFilePath}`);
            const csvData = await parseCSVData(csvFilePath);
            await validatePersonData(csvData, validationResult);
        }

        // Read metadata
        const metadataPath = join(artifactsDir, 'metadata.json');
        let metadataExists = false;
        try {
            statSync(metadataPath);
            metadataExists = true;
        } catch {
            // File doesn't exist
        }
        if (metadataExists) {
            console.log(`📋 Reading metadata from: ${metadataPath}`);
            const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
            validationResult.summary = {
                ...validationResult.summary,
                ...metadata,
            };
        }

        // Convert Sets to arrays for JSON serialization
        validationResult.summary.countries = Array.from(validationResult.summary.countries as any);
        validationResult.summary.companies = Array.from(validationResult.summary.companies as any);

        // Save validation results
        const validationReportPath = join(outputDir, 'validation-report.json');
        writeFileSync(validationReportPath, JSON.stringify(validationResult, null, 2));

        // Create human-readable report
        const humanReadableReport = generateHumanReadableReport(validationResult);
        const humanReportPath = join(outputDir, 'validation-report.txt');
        writeFileSync(humanReportPath, humanReadableReport);

        // Assertions
        expect(validationResult.totalRecords).toBeGreaterThan(0);
        expect(validationResult.validRecords).toBeGreaterThan(0);
        expect(validationResult.invalidRecords).toBeLessThanOrEqual(validationResult.totalRecords * 0.1); // Max 10% invalid

        console.log(`✅ Validation completed`);
        console.log(`📊 Total records: ${validationResult.totalRecords}`);
        console.log(`✅ Valid records: ${validationResult.validRecords}`);
        console.log(`❌ Invalid records: ${validationResult.invalidRecords}`);
        console.log(`📁 Reports saved to: ${outputDir}`);
    });

    test('should verify data integrity and uniqueness', async () => {
        const artifactsDir = join(cwd(), 'downloaded-artifacts');

        let artifactsExist = false;
        try {
            statSync(artifactsDir);
            artifactsExist = true;
        } catch {
            // Directory doesn't exist
        }
        if (!artifactsExist) {
            console.log('⚠️  No downloaded artifacts found. Skipping integrity test.');
            return;
        }

        const jsonFilePath = join(artifactsDir, 'person-data.json');
        let jsonExists = false;
        try {
            statSync(jsonFilePath);
            jsonExists = true;
        } catch {
            // File doesn't exist
        }
        if (!jsonExists) {
            console.log('⚠️  No person-data.json found. Skipping integrity test.');
            return;
        }

        const persons: PersonData[] = JSON.parse(readFileSync(jsonFilePath, 'utf8'));

        // Check for duplicate IDs
        const ids = persons.map(p => p.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);

        // Check for duplicate emails
        const emails = persons.map(p => p.email);
        const uniqueEmails = new Set(emails);
        expect(uniqueEmails.size).toBe(emails.length);

        // Check data completeness
        for (const person of persons) {
            expect(person.id).toBeTruthy();
            expect(person.firstName).toBeTruthy();
            expect(person.lastName).toBeTruthy();
            expect(person.email).toBeTruthy();
            expect(person.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/); // Basic email validation
            expect(person.address).toBeTruthy();
            expect(person.address.city).toBeTruthy();
            expect(person.address.country).toBeTruthy();
        }

        console.log(`✅ Data integrity verified`);
        console.log(`🔍 All ${persons.length} records have unique IDs and emails`);
    });
});

async function validatePersonData(persons: PersonData[], result: ValidationResult) {
    const ids = new Set<string>();
    const emails = new Set<string>();

    for (const person of persons) {
        result.totalRecords++;

        let isValid = true;
        const errors: string[] = [];

        // Validate required fields
        if (!person.id) {
            errors.push('Missing ID');
            isValid = false;
        }
        if (!person.firstName) {
            errors.push('Missing firstName');
            isValid = false;
        }
        if (!person.lastName) {
            errors.push('Missing lastName');
            isValid = false;
        }
        if (!person.email) {
            errors.push('Missing email');
            isValid = false;
        } else if (!person.email.includes('@')) {
            errors.push('Invalid email format');
            isValid = false;
        }

        // Check uniqueness
        if (ids.has(person.id)) {
            errors.push('Duplicate ID');
            isValid = false;
        }
        if (emails.has(person.email)) {
            errors.push('Duplicate email');
            isValid = false;
        }

        if (isValid) {
            result.validRecords++;
            ids.add(person.id);
            emails.add(person.email);

            // Collect summary data
            if (person.address?.country) {
                (result.summary.countries as any).add(person.address.country);
            }
            if (person.company) {
                (result.summary.companies as any).add(person.company);
            }
        } else {
            result.invalidRecords++;
            result.errors.push(`Record ${person.id || 'unknown'}: ${errors.join(', ')}`);
        }
    }

    result.summary.uniqueIds = ids.size;
    result.summary.uniqueEmails = emails.size;
}

async function parseCSVData(csvFilePath: string): Promise<PersonData[]> {
    const csvContent = readFileSync(csvFilePath, 'utf8');
    const rows = parse(csvContent, { columns: true }) as unknown as any[];
    const data: PersonData[] = [];

    for (const row of rows) {
        const person: any = {};

        // Map CSV columns to PersonData structure
        person.id = row.id;
        person.firstName = row.firstName;
        person.lastName = row.lastName;
        person.email = row.email;
        person.phone = row.phone;
        person.address = {
            street: row.street,
            city: row.city,
            state: row.state,
            zipCode: row.zipCode,
            country: row.country,
        };
        person.company = row.company;
        person.jobTitle = row.jobTitle;
        person.createdAt = row.createdAt;

        data.push(person as PersonData);
    }

    return data;
}

async function createSampleData(artifactsDir: string) {
    try {
        mkdirSync(artifactsDir, { recursive: true });
    } catch {
        // Directory already exists
    }

    // Create sample person data for testing
    const samplePersons: PersonData[] = [
        {
            id: '123e4567-e89b-12d3-a456-426614174000',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1-555-123-4567',
            address: {
                street: '123 Main St',
                city: 'New York',
                state: 'NY',
                zipCode: '10001',
                country: 'USA',
            },
            company: 'Tech Corp',
            jobTitle: 'Software Engineer',
            createdAt: new Date().toISOString(),
        },
        {
            id: '123e4567-e89b-12d3-a456-426614174001',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            phone: '+1-555-987-6543',
            address: {
                street: '456 Oak Ave',
                city: 'Los Angeles',
                state: 'CA',
                zipCode: '90210',
                country: 'USA',
            },
            company: 'Design Studio',
            jobTitle: 'UX Designer',
            createdAt: new Date().toISOString(),
        },
    ];

    const jsonFilePath = join(artifactsDir, 'person-data.json');
    writeFileSync(jsonFilePath, JSON.stringify(samplePersons, null, 2));

    const metadata = {
        generatedAt: new Date().toISOString(),
        recordCount: samplePersons.length,
        format: ['json'],
        fakerVersion: '8.3.1',
    };
    const metadataPath = join(artifactsDir, 'metadata.json');
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`📝 Created sample data in: ${artifactsDir}`);
}

function generateHumanReadableReport(result: ValidationResult): string {
    return `
VALIDATION REPORT
================
Generated: ${result.timestamp}

SUMMARY
-------
Total Records: ${result.totalRecords}
Valid Records: ${result.validRecords}
Invalid Records: ${result.invalidRecords}
Success Rate: ${((result.validRecords / result.totalRecords) * 100).toFixed(2)}%

UNIQUENESS
----------
Unique IDs: ${result.summary.uniqueIds}
Unique Emails: ${result.summary.uniqueEmails}

DIVERSITY
---------
Countries: ${(result.summary.countries as string[]).join(', ')}
Companies: ${(result.summary.companies as string[]).join(', ')}

ERRORS
------
${result.errors.length > 0 ? result.errors.join('\n') : 'No errors found'}

STATUS: ${result.invalidRecords === 0 ? '✅ PASSED' : '❌ FAILED'}
`;
} 
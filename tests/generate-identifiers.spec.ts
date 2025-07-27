import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { join } from 'node:path';
import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
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

test.describe('Generate Identifiers', () => {
    test('should generate and save person data to output directory', async () => {
        // Create output directory if it doesn't exist
        const outputDir = join(cwd(), 'output');
        if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
        }

        // Generate multiple person records
        const personCount = 10;
        const persons: PersonData[] = [];

        for (let i = 0; i < personCount; i++) {
            const person: PersonData = {
                id: faker.string.uuid(),
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                email: faker.internet.email(),
                phone: faker.phone.number(),
                address: {
                    street: faker.location.streetAddress(),
                    city: faker.location.city(),
                    state: faker.location.state(),
                    zipCode: faker.location.zipCode(),
                    country: faker.location.country(),
                },
                company: faker.company.name(),
                jobTitle: faker.person.jobTitle(),
                createdAt: faker.date.recent().toISOString(),
            };
            persons.push(person);
        }

        // Save data as JSON file
        const jsonFilePath = join(outputDir, 'person-data.json');
        writeFileSync(jsonFilePath, JSON.stringify(persons, null, 2));

        // Note: Only generating JSON files for reliability - CSV generation removed

        // Save metadata about the generation
        const metadata = {
            generatedAt: new Date().toISOString(),
            recordCount: personCount,
            format: ['json'],
            fakerVersion: '8.3.1',
        };
        const metadataPath = join(outputDir, 'metadata.json');
        writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        // Verify files were created
        const jsonExists = statSync(jsonFilePath).isFile();
        const metadataExists = statSync(metadataPath).isFile();

        expect(jsonExists).toBeTruthy();
        expect(metadataExists).toBeTruthy();

        // Verify JSON content
        const savedData = JSON.parse(readFileSync(jsonFilePath, 'utf8'));
        expect(savedData).toHaveLength(personCount);
        expect(savedData[0]).toHaveProperty('id');
        expect(savedData[0]).toHaveProperty('firstName');
        expect(savedData[0]).toHaveProperty('email');

        // Log summary for CI visibility
        console.log(`✅ Generated ${personCount} person records`);
        console.log(`📁 Files saved to: ${outputDir}`);
        console.log(`📊 JSON: ${jsonFilePath}`);
        console.log(`📋 Metadata: ${metadataPath}`);
    });

    test('should generate unique identifiers for each person', async () => {
        const personCount = 5;
        const persons: PersonData[] = [];
        const ids = new Set<string>();

        for (let i = 0; i < personCount; i++) {
            const person: PersonData = {
                id: faker.string.uuid(),
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                email: faker.internet.email(),
                phone: faker.phone.number(),
                address: {
                    street: faker.location.streetAddress(),
                    city: faker.location.city(),
                    state: faker.location.state(),
                    zipCode: faker.location.zipCode(),
                    country: faker.location.country(),
                },
                company: faker.company.name(),
                jobTitle: faker.person.jobTitle(),
                createdAt: faker.date.recent().toISOString(),
            };
            persons.push(person);
            ids.add(person.id);
        }

        // Verify all IDs are unique
        expect(ids.size).toBe(personCount);
        expect(persons.length).toBe(personCount);

        // Verify each person has required fields
        persons.forEach(person => {
            expect(person.id).toBeTruthy();
            expect(person.firstName).toBeTruthy();
            expect(person.lastName).toBeTruthy();
            expect(person.email).toBeTruthy();
            expect(person.email).toContain('@');
        });
    });

    test('should generate realistic data patterns', async () => {
        const person: PersonData = {
            id: faker.string.uuid(),
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            email: faker.internet.email(),
            phone: faker.phone.number(),
            address: {
                street: faker.location.streetAddress(),
                city: faker.location.city(),
                state: faker.location.state(),
                zipCode: faker.location.zipCode(),
                country: faker.location.country(),
            },
            company: faker.company.name(),
            jobTitle: faker.person.jobTitle(),
            createdAt: faker.date.recent().toISOString(),
        };

        // Verify UUID format
        expect(person.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

        // Verify email format
        expect(person.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

        // Verify phone number has digits
        expect(person.phone).toMatch(/\d/);

        // Verify zip code format (basic check)
        expect(person.address.zipCode).toMatch(/\d/);

        // Verify date format
        expect(new Date(person.createdAt).toISOString()).toBe(person.createdAt);
    });
}); 
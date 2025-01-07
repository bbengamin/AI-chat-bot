import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const dataFilePath = path.join(process.cwd(), 'db.json');

export async function GET() {
	try {
		if (!fs.existsSync(dataFilePath)) {
			return NextResponse.json({ error: 'File not found' }, { status: 404 });
		}

		const fileData = fs.readFileSync(dataFilePath, 'utf-8');

		return new NextResponse(fileData, {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': 'attachment; filename="db.json"',
			},
		});
	} catch (error) {
		console.error('Error while reading file:', error);
		return NextResponse.json({ error: 'Failed to download the file' }, { status: 500 });
	}
}

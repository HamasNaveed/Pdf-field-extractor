# Production-Ready PDF Field Extraction API

A production-grade REST API built using Next.js App Router, TypeScript, `pdf-lib`, and `pdfjs-dist` to parse PDF forms, extract fillable fields, detect visual labels, and fill or flatten PDF documents. Specially designed for seamless integration with **n8n** automation workflows.

---

## Key Features

1. **Complete AcroForm Extraction**: Identifies and parses all standard field types: Text, Checkbox, Radio Button, Push Button, Combo Box, Dropdown, List Box, and Signatures.
2. **Proximity-Based Label Detection**: Resolves terrible internal field names (e.g. `TextField1`) by checking surrounding page text layout using spatial bounding coordinates.
3. **Validation & Rules Engine**: Automatically flags missing required fields, empty inputs, unchecked required boxes, unselected dropdowns, missing signatures, and invalid date formats.
4. **Programmatic Filling**: Safely populates forms using JSON mapping payloads and streams back editable filled PDFs.
5. **Flattening Utility**: Renders all form widgets directly onto the document canvas to lock formatting and prevent further modification.
6. **Built-in n8n Workflow Support**: Built on standard `multipart/form-data` request shapes and outputs compliant JSON and standard application/pdf binary streams.
7. **Premium Web Dashboard**: A built-in glassmorphism-themed control panel to inspect forms, review extracted coordinates, and debug payload fills interactively.

---

## Project Architecture

```
app/
├── api/
│   ├── info/       # POST /api/info (Metadata, Encryption, XFA Check)
│   ├── extract/    # POST /api/extract (Fields extraction, Label detection)
│   ├── validate/   # POST /api/validate (Required fields & validation engine)
│   ├── fill/       # POST /api/fill (Programmatic form filling)
│   └── flatten/    # POST /api/flatten (Locks form editing, flattens PDF)
├── layout.tsx
└── page.tsx        # Interactive Control Panel (Frontend Dashboard)
components/
├── Dashboard.tsx   # Dashboard wrapper
├── FileUploader.tsx# Drag-and-drop PDF dropzone
├── ControlPanel.tsx# Actions triggers
└── ResponseViewer.tsx # Searchable field tables and JSON view
lib/pdf/
├── info.ts         # PDF catalog inspect services
├── fields.ts       # Coordinate mapping and fields compiler
├── labelDetector.ts# Proximity label detection logic
├── fill.ts         # Form filling service
├── flatten.ts      # Flattening execution
└── validate.ts     # Rules checks
types/
└── index.ts        # Strongly-typed interface definitions
```

---

## Proximity Label Detection Algorithm

Many business and government PDF forms contain generic internal field names (e.g., `row_1_input_1`). To resolve this, this project implements a proximity search:
1. All page text runs are parsed along with their coordinates via `pdfjs-dist`.
2. For each AcroForm field widget box `(fx, fy, fw, fh)` on a page, a spatial comparison maps neighboring text.
3. Scores are calculated across three specific visual target zones:
   - **Left Zone** (Text right edge is immediately left of the field left edge, vertical centers within 1.5x height):
     $$Score = (fx - (text.x + text.width)) + |fy - text.y|$$
   - **Above Zone** (Text is directly above input, aligned horizontally within -50 to +fw):
     $$Score = (text.y - (fy + fh)) + |text.x - fx| \times 1.2$$
   - **Upper-Left Zone** (Text sits above and to the left):
     $$Score = \sqrt{(fx - (text.x + text.width))^2 + (text.y - (fy + fh))^2} \times 1.5$$
4. The text block with the lowest score (under a $150$ points threshold) is sanitized and matched as the field's user-friendly `label`.

---

## Getting Started

### Prerequisites

- Node.js >= 22.13.0
- npm or another package manager

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/HamasNaveed/Pdf-field-extractor.git
   cd Pdf-field-extractor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server locally:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view the interactive Control Panel.

4. Build for production:
   ```bash
   npm run build
   ```

---

## API Documentation

All endpoints expect requests in `multipart/form-data` encoding.

### 1. POST `/api/info`
Inspects general PDF properties.
- **Form Field**: `pdf` (Binary File)
- **Response example**:
  ```json
  {
    "success": true,
    "fileName": "irs_w9.pdf",
    "pages": 4,
    "fieldCount": 52,
    "hasAcroForm": true,
    "hasXFA": false,
    "encrypted": false
  }
  ```

### 2. POST `/api/extract`
Extracts all field parameters, coordinates, properties, and detected visual labels.
- **Form Field**: `pdf` (Binary File)
- **Response example**:
  ```json
  {
    "success": true,
    "fileName": "employment_form.pdf",
    "pageCount": 1,
    "fieldCount": 1,
    "fields": [
      {
        "internalName": "given_name",
        "label": "First Name",
        "type": "text",
        "page": 1,
        "required": true,
        "readonly": false,
        "hidden": false,
        "printable": true,
        "currentValue": "John",
        "defaultValue": "",
        "exportValue": null,
        "options": [],
        "maxLength": 35,
        "multiline": false,
        "password": false,
        "rotation": 0,
        "rect": {
          "x": 120,
          "y": 450,
          "width": 200,
          "height": 20
        },
        "x": 120,
        "y": 450,
        "width": 200,
        "height": 20
      }
    ]
  }
  ```

### 3. POST `/api/validate`
Checks required constraints, empty checkboxes, missing signatures, and date formats.
- **Form Field**: `pdf` (Binary File)
- **Response example**:
  ```json
  {
    "success": true,
    "valid": false,
    "errors": [
      {
        "field": "ApplicantSignature",
        "reason": "Signature missing"
      },
      {
        "field": "SubmissionDate",
        "reason": "Invalid date format"
      }
    ]
  }
  ```

### 4. POST `/api/fill`
Injects values into AcroForm fields and returns the populated PDF file.
- **Form Fields**:
  - `pdf` (Binary File)
  - `data` (JSON String: mapping internal names to values)
- **Response**: `application/pdf` binary stream.

### 5. POST `/api/flatten`
Flattens form fields to prevent further editing and exports the locked PDF.
- **Form Field**: `pdf` (Binary File)
- **Response**: `application/pdf` binary stream.

---

## CURL Examples

### Extract Form Fields
```bash
curl -X POST -F "pdf=@/path/to/form.pdf" http://localhost:3000/api/extract
```

### Fill Form Fields
```bash
curl -X POST \
  -F "pdf=@/path/to/form.pdf" \
  -F 'data={"given_name":"Jane","agree_to_terms":"true"}' \
  --output filled_form.pdf \
  http://localhost:3000/api/fill
```

### Flatten Form Fields
```bash
curl -X POST \
  -F "pdf=@/path/to/form.pdf" \
  --output flattened.pdf \
  http://localhost:3000/api/flatten
```

---

## n8n Integration Guide

Use the **HTTP Request** node in your n8n workflows to interact with the API.

### Config Step for Field Extraction
1. **Method**: `POST`
2. **URL**: `https://<your-vercel-deployment-domain>/api/extract`
3. **Send Body**: Yes
4. **Body Content Type**: `Multipart`
5. **Parameters**:
   - **Name**: `pdf`
   - **Type**: `File`
   - **Value**: `{{ $json.binary.data }}` (Reference the binary input from a previous email attachment or Google Drive trigger)

### Config Step for PDF Filling
1. **Method**: `POST`
2. **URL**: `https://<your-vercel-deployment-domain>/api/fill`
3. **Send Body**: Yes
4. **Body Content Type**: `Multipart`
5. **Parameters**:
   - **Parameter 1**:
     - **Name**: `pdf`
     - **Type**: `File`
     - **Value**: `{{ $json.binary.data }}`
   - **Parameter 2**:
     - **Name**: `data`
     - **Type**: `Form-Data`
     - **Value**: `{{ JSON.stringify({ "given_name": $json.customerName, "agree_to_terms": "true" }) }}`
6. **Response Format**: `File` (This maps the returned binary stream directly into an n8n binary payload, ready for email nodes or file uploads)

---

## Troubleshooting

- **"This PDF uses XFA forms which are not supported."**:
  XFA (XML Forms Architecture) is a deprecated Adobe XML format inside PDFs. It does not use the standard PDF AcroForm model. Converting XFA forms to standard AcroForm fields (e.g., using Acrobat Save-As) is required before running extractions.
- **Large Document Processing**:
  For large PDFs (above 100 pages), Vercel serverless functions can sometimes exceed memory limits or run times. Ensure `vercel.json` contains `"maxDuration": 60` or consider self-hosting standard Node instances if documents regularly exceed 300+ pages.
- **Password Requirement Error**:
  If the PDF throws a decryption failure, it means the document is password-protected. Decrypt or unlock the PDF file before uploading it to the API.

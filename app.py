from flask import Flask, render_template, request, jsonify, send_file
import hashlib
import re
import os
from fpdf import FPDF
from io import BytesIO
from datetime import datetime

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)


def analyze_password(password):
    score = 0
    feedback = []
    checks = {}

    # Length check
    length = len(password)
    if length < 8:
        feedback.append("Password must be at least 8 characters long")
        checks['length'] = False
    elif length >= 16:
        score += 2
        checks['length'] = True
    else:
        score += 1
        checks['length'] = True

    # Uppercase
    if re.search(r'[A-Z]', password):
        score += 1
        checks['uppercase'] = True
    else:
        feedback.append("Add at least one uppercase letter (A-Z)")
        checks['uppercase'] = False

    # Lowercase
    if re.search(r'[a-z]', password):
        score += 1
        checks['lowercase'] = True
    else:
        feedback.append("Add at least one lowercase letter (a-z)")
        checks['lowercase'] = False

    # Number
    if re.search(r'\d', password):
        score += 1
        checks['number'] = True
    else:
        feedback.append("Add at least one number (0-9)")
        checks['number'] = False

    # Special character
    if re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
        score += 2
        checks['special'] = True
    else:
        feedback.append("Add at least one special character (!@#$%^&*...)")
        checks['special'] = False

    # No common patterns
    common_patterns = ['password', '123456', 'qwerty', 'abc123', 'letmein']
    if any(p in password.lower() for p in common_patterns):
        score -= 2
        feedback.append("Avoid common password patterns")
        checks['no_common'] = False
    else:
        checks['no_common'] = True

    # Determine strength level
    if score <= 2:
        strength = 'Weak'
        strength_class = 'weak'
        percent = 25
    elif score <= 4:
        strength = 'Medium'
        strength_class = 'medium'
        percent = 55
    elif score <= 6:
        strength = 'Strong'
        strength_class = 'strong'
        percent = 80
    else:
        strength = 'Very Strong'
        strength_class = 'very-strong'
        percent = 100

    if not feedback:
        feedback.append("Great password! No issues found.")

    return {
        'strength': strength,
        'strength_class': strength_class,
        'score': score,
        'percent': percent,
        'feedback': feedback,
        'checks': checks,
        'length': length
    }


def generate_password(length=16):
    import random
    import string
    chars = string.ascii_letters + string.digits + "!@#$%^&*()"
    while True:
        pwd = ''.join(random.choice(chars) for _ in range(length))
        result = analyze_password(pwd)
        if result['strength'] in ['Strong', 'Very Strong']:
            return pwd


def hash_data(data, is_file=True):
    if is_file:
        md5 = hashlib.md5(data).hexdigest()
        sha1 = hashlib.sha1(data).hexdigest()
        sha256 = hashlib.sha256(data).hexdigest()
    else:
        encoded = data.encode('utf-8')
        md5 = hashlib.md5(encoded).hexdigest()
        sha1 = hashlib.sha1(encoded).hexdigest()
        sha256 = hashlib.sha256(encoded).hexdigest()
    return {'md5': md5, 'sha1': sha1, 'sha256': sha256}


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/analyze-password', methods=['POST'])
def api_analyze_password():
    data = request.get_json()
    password = data.get('password', '')
    if not password:
        return jsonify({'error': 'No password provided'}), 400
    result = analyze_password(password)
    return jsonify(result)


@app.route('/api/generate-password', methods=['POST'])
def api_generate_password():
    data = request.get_json()
    length = int(data.get('length', 16))
    length = max(8, min(32, length))
    pwd = generate_password(length)
    return jsonify({'password': pwd})


@app.route('/api/hash-file', methods=['POST'])
def api_hash_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    f = request.files['file']
    if f.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    file_data = f.read()
    hashes = hash_data(file_data, is_file=True)
    return jsonify({
        'filename': f.filename,
        'size': len(file_data),
        **hashes
    })


@app.route('/api/verify-integrity', methods=['POST'])
def api_verify_integrity():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    f = request.files['file']
    expected_hash = request.form.get('expected_hash', '').strip().lower()
    hash_type = request.form.get('hash_type', 'sha256')

    if not expected_hash:
        return jsonify({'error': 'No expected hash provided'}), 400

    file_data = f.read()
    hashes = hash_data(file_data, is_file=True)
    actual_hash = hashes.get(hash_type, '')

    matched = actual_hash.lower() == expected_hash.lower()
    return jsonify({
        'filename': f.filename,
        'hash_type': hash_type.upper(),
        'actual_hash': actual_hash,
        'expected_hash': expected_hash,
        'matched': matched,
        'all_hashes': hashes
    })


@app.route('/api/export-password-pdf', methods=['POST'])
def api_export_password_pdf():
    try:
        data = request.get_json()
        password = data.get('password', '')
        strength = data.get('strength', 'Unknown')
        score = data.get('score', 0)
        length = data.get('length', 0)
        feedback = data.get('feedback', [])
        checks = data.get('checks', {})
        
        if not password:
            return jsonify({'error': 'No password provided'}), 400
        
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font('Helvetica', 'B', 16)
        pdf.cell(0, 10, 'Password Strength Report', ln=True, align='C')
        
        pdf.set_font('Helvetica', '', 10)
        pdf.ln(5)
        pdf.cell(0, 6, f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', ln=True, align='C')
        pdf.ln(5)
        
        # Strength assessment
        pdf.set_font('Helvetica', 'B', 12)
        pdf.cell(0, 8, 'Strength Assessment', ln=True)
        pdf.set_font('Helvetica', '', 10)
        pdf.cell(0, 6, f'Strength: {strength}', ln=True)
        pdf.cell(0, 6, f'Score: {score} / 7', ln=True)
        pdf.cell(0, 6, f'Length: {length} characters', ln=True)
        pdf.ln(5)
        
        # Checks
        pdf.set_font('Helvetica', 'B', 12)
        pdf.cell(0, 8, 'Criteria Checks', ln=True)
        pdf.set_font('Helvetica', '', 9)
        checks_map = {
            'length': 'Minimum 8 characters',
            'uppercase': 'Uppercase letter',
            'lowercase': 'Lowercase letter',
            'number': 'Number (0-9)',
            'special': 'Special character',
            'no_common': 'No common patterns'
        }
        for key, label in checks_map.items():
            status = 'PASS' if checks.get(key, False) else 'FAIL'
            pdf.cell(0, 6, f'[{status}] {label}', ln=True)
        pdf.ln(5)
        
        # Feedback
        pdf.set_font('Helvetica', 'B', 12)
        pdf.cell(0, 8, 'Feedback', ln=True)
        pdf.set_font('Helvetica', '', 9)
        if feedback:
            for item in feedback:
                pdf.multi_cell(0, 5, f'• {item}')
        else:
            pdf.cell(0, 5, 'No feedback available', ln=True)
        
        pdf_bytes = pdf.output()
        return send_file(BytesIO(pdf_bytes), mimetype='application/pdf', as_attachment=True, download_name=f'password_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf')
    
    except Exception as e:
        return jsonify({'error': f'PDF generation failed: {str(e)}'}), 500


@app.route('/api/export-hash-pdf', methods=['POST'])
def api_export_hash_pdf():
    data = request.get_json()
    filename = data.get('filename', 'file')
    size = data.get('size', 0)
    md5 = data.get('md5', '')
    sha1 = data.get('sha1', '')
    sha256 = data.get('sha256', '')
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 16)
    pdf.cell(0, 10, 'File Hash Report', ln=True, align='C')
    
    pdf.set_font('Helvetica', '', 10)
    pdf.ln(5)
    pdf.cell(0, 6, f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', ln=True, align='C')
    pdf.ln(5)
    
    # File info
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(0, 8, 'File Information', ln=True)
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(0, 6, f'Filename: {filename}', ln=True)
    pdf.cell(0, 6, f'File Size: {size} bytes', ln=True)
    pdf.ln(5)
    
    # Hashes
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(0, 8, 'Cryptographic Hashes', ln=True)
    pdf.set_font('Helvetica', '', 9)
    pdf.cell(40, 6, 'MD5:')
    pdf.cell(0, 6, md5, ln=True)
    pdf.cell(40, 6, 'SHA-1:')
    pdf.cell(0, 6, sha1, ln=True)
    pdf.cell(40, 6, 'SHA-256:')
    pdf.cell(0, 6, sha256, ln=True)
    
    pdf_bytes = pdf.output()
    return send_file(BytesIO(pdf_bytes), mimetype='application/pdf', as_attachment=True, download_name=f'hash_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf')


@app.route('/api/export-integrity-pdf', methods=['POST'])
def api_export_integrity_pdf():
    data = request.get_json()
    filename = data.get('filename', 'file')
    hash_type = data.get('hash_type', 'SHA-256')
    actual_hash = data.get('actual_hash', '')
    expected_hash = data.get('expected_hash', '')
    matched = data.get('matched', False)
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 16)
    pdf.cell(0, 10, 'File Integrity Verification Report', ln=True, align='C')
    
    pdf.set_font('Helvetica', '', 10)
    pdf.ln(5)
    pdf.cell(0, 6, f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', ln=True, align='C')
    pdf.ln(5)
    
    # Verification result
    pdf.set_font('Helvetica', 'B', 12)
    result_text = 'VERIFIED - Hash Matched' if matched else 'FAILED - Hash Mismatch'
    pdf.cell(0, 8, result_text, ln=True)
    pdf.ln(5)
    
    # File info
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(0, 8, 'File Information', ln=True)
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(0, 6, f'Filename: {filename}', ln=True)
    pdf.cell(0, 6, f'Algorithm: {hash_type}', ln=True)
    pdf.ln(5)
    
    # Hashes
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(0, 8, 'Hash Comparison', ln=True)
    pdf.set_font('Helvetica', '', 9)
    pdf.cell(0, 6, 'Expected Hash:', ln=True)
    pdf.set_font('Courier', '', 8)
    pdf.multi_cell(0, 5, expected_hash)
    pdf.set_font('Helvetica', '', 9)
    pdf.cell(0, 6, 'Actual Hash:', ln=True)
    pdf.set_font('Courier', '', 8)
    pdf.multi_cell(0, 5, actual_hash)
    pdf.set_font('Helvetica', '', 10)
    pdf.ln(3)
    pdf.cell(0, 6, f'Match Status: {"PASSED" if matched else "FAILED"}', ln=True)
    
    pdf_bytes = pdf.output()
    return send_file(BytesIO(pdf_bytes), mimetype='application/pdf', as_attachment=True, download_name=f'integrity_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf')


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

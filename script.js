// ==========================================
// 1. CONFIGURATION & STATE MANAGEMENT
// ==========================================
const AWS_API_GATEWAY_URL = "https://gqns1d7wza.execute-api.us-east-1.amazonaws.com/prod/register";

let dynamicActiveType = 'candidate';
let payloadDataPacket = {};

const isJapanese = () => document.documentElement.classList.contains('lang-ja');

// ==========================================
// 2. LANGUAGE TOGGLE LOCALIZATION
// ==========================================
const langToggleBtn = document.getElementById('langToggle');

langToggleBtn.addEventListener('click', () => {
    const htmlEl = document.documentElement;
    const isJa = htmlEl.classList.contains('lang-ja');
    
    htmlEl.classList.toggle('lang-ja', !isJa);
    htmlEl.setAttribute('lang', isJa ? 'en' : 'ja');
    langToggleBtn.textContent = isJa ? 'JA' : 'EN';
});

// ==========================================
// 3. SLIDER TRACK NAVIGATION
// ==========================================
function switchForm(type) {
    const track = document.getElementById('formTrack');
    const tabCandidate = document.getElementById('tabCandidate');
    const tabEnterprise = document.getElementById('tabEnterprise');

    if (type === 'candidate') {
        track.style.transform = 'translateX(0%)';
        tabCandidate.classList.add('active');
        tabEnterprise.classList.remove('active');
    } else {
        track.style.transform = 'translateX(-50%)';
        tabEnterprise.classList.add('active');
        tabCandidate.classList.remove('active');
    }
}

const handleSmoothScroll = (e) => {
    e.preventDefault();
    document.getElementById('interactive-form-section').scrollIntoView({ behavior: 'smooth' });
};

document.getElementById('navContact').addEventListener('click', handleSmoothScroll);

document.getElementById('navJoinUs').addEventListener('click', (e) => {
    handleSmoothScroll(e);
    switchForm('candidate');
});

document.getElementById('navHireUs').addEventListener('click', (e) => {
    handleSmoothScroll(e);
    switchForm('enterprise');
});

// ==========================================
// 4. VERIFICATION MODAL MECHANICS & VALIDATION
// ==========================================
function openReviewModal(event, type) {
    event.preventDefault();
    dynamicActiveType = type;
    
    const container = document.getElementById('modalTargetContent');
    container.innerHTML = '';
    
    let dataset = [];
    const activeLanguageKey = isJapanese() ? 'ja' : 'en';

    if (type === 'candidate') {
        const jlptInput = document.getElementById('candJlpt');
        const checkedAws = document.querySelector('input[name="candAws"]:checked');
        
        const jlptValue = jlptInput.value.trim();
        const awsValue = checkedAws ? checkedAws.value : '';

        // NEW: Enforce validation blocks for JLPT "none" and AWS "No"
        if (jlptValue.toLowerCase() === 'none' && awsValue === 'No') {
            const errorMsg = isJapanese() 
                ? 'JLPTが「none」かつAWS知識が「No」の場合は、フォームを送信できません。' 
                : 'Applications cannot be submitted if JLPT level is "none" and AWS Knowledge is "No".';
            alert(errorMsg);
            jlptInput.focus();
            return; // Hard stop: kills execution, modal will not open
        }

        payloadDataPacket = {
            fullName: document.getElementById('candName').value,
            email: document.getElementById('candEmail').value,
            phoneProfile: document.getElementById('candPhone').value,
            jlptLevel: jlptValue,
            awsKnowledge: awsValue,
            githubUrl: document.getElementById('candGithub').value, 
            language: activeLanguageKey
        };
        
        dataset = [
            { labelEn: 'Full Name', labelJa: '氏名', val: payloadDataPacket.fullName },
            { labelEn: 'Email', labelJa: 'メールアドレス', val: payloadDataPacket.email },
            { labelEn: 'Communications Profile', labelJa: '電話番号', val: payloadDataPacket.phoneProfile },
            { labelEn: 'JLPT Level', labelJa: '日本語能力試験 (JLPT)', val: payloadDataPacket.jlptLevel },
            { labelEn: 'AWS Knowledge', labelJa: 'AWS知識の有無', val: payloadDataPacket.awsKnowledge },
            { labelEn: 'GitHub Profile', labelJa: 'GitHubプロファイル', val: payloadDataPacket.githubUrl } 
        ];
    } else {
        payloadDataPacket = {
            companyName: document.getElementById('entCompany').value,
            email: document.getElementById('entEmail').value,
            phoneProfile: document.getElementById('entPhone').value,
            targetSector: document.getElementById('entSector').value,
            projectNeed: document.getElementById('entProject').value,
            language: activeLanguageKey
        };
        
        dataset = [
            { labelEn: 'Company Name', labelJa: '企業名', val: payloadDataPacket.companyName },
            { labelEn: 'Email', labelJa: '担当者メールアドレス', val: payloadDataPacket.email },
            { labelEn: 'Communications Profile', labelJa: '担当者電話番号', val: payloadDataPacket.phoneProfile },
            { labelEn: 'Target Sector', labelJa: '希望セクター', val: payloadDataPacket.targetSector },
            { labelEn: 'Project Need', labelJa: 'プロジェクト要件詳細', val: payloadDataPacket.projectNeed }
        ];
    }

    dataset.forEach(item => {
        const div = document.createElement('div');
        div.className = 'review-item';
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'review-label';
        labelDiv.textContent = isJapanese() ? item.labelJa : item.labelEn;
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'review-value';
        valueDiv.textContent = (item.val && item.val.trim() !== '') ? item.val : '—'; 
        
        div.appendChild(labelDiv);
        div.appendChild(valueDiv);
        container.appendChild(div);
    });

    document.getElementById('reviewModal').classList.add('active');
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.remove('active');
}

// ==========================================
// 5. BACKEND PAYLOAD DELIVERY
// ==========================================
async function commitFinalRegistration() {
    const confirmBtn = document.getElementById('modalConfirmBtn');
    const isJa = isJapanese();
    
    confirmBtn.disabled = true;
    confirmBtn.textContent = isJa ? '送信中...' : 'Sending...';

    try {
        const response = await fetch(AWS_API_GATEWAY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadDataPacket)
        });

        if (!response.ok) {
            throw new Error(`HTTP network error encountered: ${response.status}`);
        }

        alert(isJa ? '送信が正常に完了しました。' : 'Payload successfully delivered to processing layers.');
        
        closeReviewModal();
        const formId = dynamicActiveType === 'candidate' ? 'candidateActualForm' : 'enterpriseActualForm';
        document.getElementById(formId).reset();

    } catch (error) {
        console.error("Critical delivery failure:", error);
        alert(isJa ? 'エラーが発生しました。しばらく経ってから再度お試しください。' : 'Transmission pipeline interrupted. Check configuration contexts.');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = isJa ? '確定して送信' : 'Confirm & Send';
    }
}

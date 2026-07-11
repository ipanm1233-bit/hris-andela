// js/views/form-builder.js
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

(async function runFormBuilder() {
    const db = getFirestore();

    // Pastikan elemen DOM benar-benar sudah siap sedia di layar
    const listContainer = document.getElementById('formListContainer');
    if (!listContainer) return;

    let currentFormId = null;
    let formsList = [];
    let approvalFlow = [];
    let fieldsList = [];

    const elements = {
        formList: listContainer,
        configBox: document.getElementById('configContainer'),
        btnNew: document.getElementById('btnNewForm'),
        btnInit: document.getElementById('btnInitForm'),
        btnSave: document.getElementById('btnSaveConfig'),
        btnDel: document.getElementById('btnDeleteForm'),
        btnAddAppr: document.getElementById('btnAddApproval'),
        flowRender: document.getElementById('approvalFlowRender'),
        btnAddField: document.getElementById('btnAddField'),
        fieldsBox: document.getElementById('fieldsContainer'),
        nameInput: document.getElementById('cfgNamaForm'),
        idInput: document.getElementById('cfgIdForm'),
        typeInput: document.getElementById('cfgTipeForm'),
        tembusanInput: document.getElementById('cfgTembusan'),
        dateDisplay: document.getElementById('builderDateDisplay')
    };

    if(elements.dateDisplay) {
        elements.dateDisplay.innerText = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    const inputTypes = [
        { value: "text", label: "Teks Singkat" },
        { value: "textarea", label: "Teks Panjang" },
        { value: "number", label: "Angka / Nominal" },
        { value: "date", label: "Tanggal" },
        { value: "time", label: "Jam / Waktu" },
        { value: "select", label: "Dropdown Pilihan" },
        { value: "file", label: "Upload Bukti Dokumen" }
    ];

    async function fetchForms() {
        elements.formList.innerHTML = '<div class="p-4 text-center text-gray-400 text-xs italic">Memuat daftar...</div>';
        try {
            const snap = await getDocs(collection(db, "master_form"));
            formsList = [];
            snap.forEach(doc => formsList.push({ id: doc.id, ...doc.data() }));
            renderList();
        } catch (e) {
            elements.formList.innerHTML = '<div class="p-4 text-center text-red-500 text-xs font-bold">Gagal memuat.</div>';
        }
    }

    function renderList() {
        elements.formList.innerHTML = '';
        if (formsList.length === 0) {
            elements.formList.innerHTML = '<div class="p-4 text-center text-gray-400 text-xs italic">Belum ada form terdaftar.</div>';
            return;
        }
        formsList.forEach(form => {
            const item = document.createElement('div');
            item.className = `p-3.5 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-all ${currentFormId === form.id ? 'border-l-4 border-l-red-600 bg-red-50/70 font-extrabold text-red-700' : 'text-gray-700 text-sm font-medium'}`;
            item.innerHTML = `<p class="truncate tracking-tight">${form.Nama_Form || form.ID_Form}</p>`;
            item.onclick = () => loadConfig(form.id);
            elements.formList.appendChild(item);
        });
    }

    function loadConfig(id) {
        currentFormId = id;
        renderList();
        elements.configBox.classList.remove('hidden');
        elements.btnDel.classList.remove('hidden');

        const form = formsList.find(f => f.id === id);
        if(!form) return;

        elements.nameInput.value = form.Nama_Form || '';
        elements.idInput.value = form.ID_Form || form.id || '';
        elements.idInput.readOnly = true;
        elements.typeInput.value = form.Tipe_Form || '';
        elements.tembusanInput.value = form.TembusanEmail || '';

        try { approvalFlow = typeof form.ApprovalFlowJson === 'string' ? JSON.parse(form.ApprovalFlowJson) : (form.ApprovalFlowJson||[]); } catch(e){ approvalFlow=[]; }
        renderFlow();

        try { 
            let r = form.DetailJSON; 
            if(typeof r === 'string') r = JSON.parse(r); 
            fieldsList = Array.isArray(r) ? r : []; 
        } catch(e){ fieldsList=[]; }
        renderFields();
    }

    function newForm() {
        currentFormId = null;
        renderList();
        elements.configBox.classList.remove('hidden');
        elements.btnDel.classList.add('hidden');
        elements.nameInput.value = '';
        elements.idInput.value = `F-ISO-${Date.now().toString().slice(-4)}`;
        elements.idInput.readOnly = false;
        elements.typeInput.value = '';
        elements.tembusanInput.value = '';
        approvalFlow = []; renderFlow();
        fieldsList = []; renderFields();
    }

    elements.btnNew.addEventListener('click', newForm);
    elements.btnInit.addEventListener('click', newForm);

    function renderFlow() {
        elements.flowRender.innerHTML = '';
        if(approvalFlow.length === 0) { elements.flowRender.innerHTML = '<span class="text-xs italic text-gray-400">Persetujuan Kosong (Auto-Approve)</span>'; return; }
        
        approvalFlow.forEach((role, i) => {
            const node = document.createElement('div');
            node.className = 'flex items-center shrink-0';
            node.innerHTML = `
                <div class="bg-white border border-gray-300 px-3 py-2 rounded-xl shadow-sm text-xs font-bold text-gray-700 flex items-center">
                    <span class="text-red-600 font-mono mr-1.5">${i+1}.</span> ${role} 
                    <button class="ml-2 text-gray-400 hover:text-red-600 font-bold remove-flow" data-index="${i}">×</button>
                </div>
                ${i < approvalFlow.length-1 ? '<span class="mx-1.5 text-gray-400 font-bold">➔</span>' : ''}
            `;
            elements.flowRender.appendChild(node);
        });

        document.querySelectorAll('.remove-flow').forEach(btn => {
            btn.addEventListener('click', (e) => {
                approvalFlow.splice(e.target.dataset.index, 1);
                renderFlow();
            });
        });
    }

    elements.btnAddAppr.addEventListener('click', () => {
        approvalFlow.push(document.getElementById('addRoleSelect').value);
        renderFlow();
    });

    function renderFields() {
        elements.fieldsBox.innerHTML = '';
        if(fieldsList.length === 0) { elements.fieldsBox.innerHTML = '<p class="text-center text-gray-400 text-sm py-6 italic bg-white rounded-xl border">Belum ada kolom isian dibuat. Klik "+ Tambah Field Baru".</p>'; return; }

        fieldsList.forEach((field, i) => {
            let opts = '';
            inputTypes.forEach(t => opts += `<option value="${t.value}" ${t.value===field.type?'selected':''}>${t.label}</option>`);

            const html = `
            <div class="field-item bg-white p-5 rounded-2xl border border-gray-200 shadow-sm mb-4 relative" data-index="${i}">
                <div class="flex flex-col sm:flex-row gap-4 items-end">
                    <div class="flex-1 w-full">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Pertanyaan / Label Input</label>
                        <input type="text" class="f-label w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-red-500 font-bold text-gray-700" value="${field.label||''}" placeholder="Contoh: Alasan Cuti">
                    </div>
                    <div class="w-full sm:w-48">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tipe Input</label>
                        <select class="f-type w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white font-semibold text-gray-700">${opts}</select>
                    </div>
                    <div class="flex items-center h-10 shrink-0">
                        <label class="text-sm font-bold text-gray-600 cursor-pointer flex items-center"><input type="checkbox" class="f-req mr-1.5 w-4 h-4 rounded text-red-600 focus:ring-red-500" ${field.required?'checked':''}>Wajib Diisi</label>
                    </div>
                    <button class="text-red-500 hover:text-red-700 font-bold text-sm h-10 shrink-0 px-2 remove-field" data-index="${i}">Hapus</button>
                </div>
                ${field.type === 'select' ? `
                <div class="mt-3 bg-red-50/30 p-3 rounded-xl border border-red-100">
                    <label class="block text-[9px] font-bold text-red-500 uppercase mb-1">Opsi Dropdown (Pisahkan Dengan Koma)</label>
                    <input type="text" class="f-opts w-full px-4 py-2 border border-gray-300 rounded-xl text-xs bg-white" value="${(field.options||[]).join(', ')}" placeholder="Contoh: Pilihan A, Pilihan B, Pilihan C">
                </div>` : ''}
            </div>`;
            elements.fieldsBox.insertAdjacentHTML('beforeend', html);
        });

        document.querySelectorAll('.remove-field').forEach(btn => btn.addEventListener('click', (e) => {
            syncFields(); fieldsList.splice(e.target.dataset.index, 1); renderFields();
        }));
        document.querySelectorAll('.f-type').forEach(sel => sel.addEventListener('change', () => {
            syncFields(); renderFields();
        }));
    }

    function syncFields() {
        fieldsList = [];
        document.querySelectorAll('.field-item').forEach(item => {
            const type = item.querySelector('.f-type').value;
            let fieldObj = {
                label: item.querySelector('.f-label').value,
                type: type,
                required: item.querySelector('.f-req').checked,
                id: item.querySelector('.f-label').value.toLowerCase().replace(/[^a-z0-9]/g, '_')
            };
            if(type === 'select') {
                const optInput = item.querySelector('.f-opts');
                if(optInput) fieldObj.options = optInput.value.split(',').map(s=>s.trim()).filter(s=>s);
            }
            fieldsList.push(fieldObj);
        });
    }

    elements.btnAddField.addEventListener('click', () => { syncFields(); fieldsList.push({label:'Pertanyaan Baru', type:'text', required:false}); renderFields(); });

    elements.btnSave.addEventListener('click', async () => {
        syncFields();
        const idForm = elements.idInput.value.trim().toUpperCase();
        if(!idForm || !elements.nameInput.value.trim()) { alert("ID Form dan Nama Form wajib diisi!"); return; }

        elements.btnSave.innerText = "Sedang Menyimpan...";
        try {
            await setDoc(doc(db, "master_form", idForm), {
                ID_Form: idForm,
                Nama_Form: elements.nameInput.value.trim(),
                Tipe_Form: elements.typeInput.value.trim().toUpperCase(),
                TembusanEmail: elements.tembusanInput.value.trim(),
                ApprovalFlowJson: JSON.stringify(approvalFlow),
                DetailJSON: JSON.stringify(fieldsList),
                isActive: true
            });
            alert("Konfigurasi Form ISO Berhasil Disimpan!");
            fetchForms();
        } catch(e) { alert("Gagal menyimpan ke database."); }
        elements.btnSave.innerText = "Simpan Semua Konfigurasi";
    });

    elements.btnDel.addEventListener('click', async () => {
        if(!currentFormId) return;
        if(!confirm("Hapus form ini secara permanen dari sistem?")) return;
        try {
            await deleteDoc(doc(db, "master_form", currentFormId));
            alert("Form Terhapus!");
            newForm(); fetchForms();
        } catch(e) { alert("Gagal"); }
    });

    fetchForms();
})();

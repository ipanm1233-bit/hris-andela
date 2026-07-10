// js/auth.js
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", () => {
    const btnLogin = document.getElementById("btnLogin");
    const pesanError = document.getElementById("pesanError");

    btnLogin.addEventListener("click", async () => {
        // 1. Ambil nilai input
        let nik = document.getElementById("inputNIK").value;
        const email = document.getElementById("inputEmail").value;
        const password = document.getElementById("inputPassword").value;

        // 2. Sanitasi Spasi (Wajib untuk mencegah error input manual)
        nik = nik.replace(/\s+/g, '').toUpperCase();

        if(!nik || !email || !password) {
            tampilkanError("Semua kolom harus diisi!");
            return;
        }

        // 3. Ubah tombol jadi loading state
        btnLogin.innerHTML = "Memproses...";
        btnLogin.disabled = true;

        try {
            // 4. Proses Login Firebase
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Simpan NIK di memori browser
            localStorage.setItem("userNIK", nik);
            localStorage.setItem("userUID", user.uid);
            
            // Arahkan ke dashboard
            window.location.href = "/dashboard.html"; 

        } catch (error) {
            console.error("Error:", error);
            tampilkanError("Login gagal! Periksa Email dan Password.");
            
            // Kembalikan tombol seperti semula
            btnLogin.innerHTML = "Masuk ke Sistem";
            btnLogin.disabled = false;
        }
    });

    function tampilkanError(pesan) {
        pesanError.textContent = pesan;
        pesanError.classList.remove("hidden");
    }
});

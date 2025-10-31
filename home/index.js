
    <script>
        const form = document.getElementById('loginForm');
        const email = document.getElementById('email');
        const password = document.getElementById('password');
        const emailError = document.getElementById('emailError');
        const passError = document.getElementById('passError');
        const togglePass = document.getElementById('togglePass');

        function showError(el, msg){
            el.textContent = msg;
            el.hidden = false;
        }
        function clearError(el){
            el.textContent = '';
            el.hidden = true;
        }

        togglePass.addEventListener('click', () => {
            const shown = password.type === 'text';
            password.type = shown ? 'password' : 'text';
            togglePass.textContent = shown ? 'Afficher' : 'Masquer';
            togglePass.setAttribute('aria-pressed', String(!shown));
        });

        form.addEventListener('submit', (e) => {
            clearError(emailError);
            clearError(passError);

            let valid = true;

            if (!email.value.trim()) {
                showError(emailError, "L'email est requis.");
                valid = false;
            } else if (!/^\S+@\S+\.\S+$/.test(email.value)) {
                showError(emailError, "Entrez une adresse e-mail valide.");
                valid = false;
            }

            if (!password.value) {
                showError(passError, "Le mot de passe est requis.");
                valid = false;
            } else if (password.value.length < 6) {
                showError(passError, "Le mot de passe doit contenir au moins 6 caractères.");
                valid = false;
            }

            if (!valid) {
                e.preventDefault();
                return;
            }

            // Optionnel : remplacer par envoi fetch si tu veux appeler une API (ex: fetch('/api/login', {...}))
            // Le formulaire va poster vers l'attribut action="/login". Adapte selon ton backend.
        });

        // Accessibilité : supprime les messages d'erreur quand l'utilisateur corrige.
        email.addEventListener('input', () => clearError(emailError));
        password.addEventListener('input', () => clearError(passError));
    </script>
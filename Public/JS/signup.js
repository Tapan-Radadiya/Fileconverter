function checkPasswordStrength() {
    const password = document.getElementById("userPassword").value;
    const strengthIndicators = document.getElementById("strengthIndicators")
    const minLength = 8
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumbers = /[\d]/.test(password)
    const hasSpecialChar = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]/.test(password)
    let score = 0;

    if (password.length > minLength) score++
    if (hasUppercase) score++
    if (hasLowercase) score++
    if (hasNumbers) score++
    if (hasSpecialChar) score++

    if (score === 5) {
        strengthIndicators.innerHTML = "Very Strong"
        strengthIndicators.style.color = "green";
    }
    else if (score >= 3) {
        strengthIndicators.innerHTML = "Strong"
        strengthIndicators.style.color = "blue";
    }
    else if (score >= 2) {
        strengthIndicators.innerHTML = "Very Moderate"
        strengthIndicators.style.color = "orange";
    }
    else if (score >= 1) {
        strengthIndicators.innerHTML = "Very Weak"
        strengthIndicators.style.color = "red";
    }
    else
        strengthIndicators.innerHTML = "very Weak"
    strengthIndicators.style.color = "red";
}
// Example function tied to your HTML login form submission
async function loginUser(email, password) {
    try {
        const response = await fetch('https://campushire-6.onrender.com/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Save the JWT token to local storage
            localStorage.setItem('token', data.token);
            alert('Login successful!');
            
            // Redirect based on role
            if (data.role === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'student-dashboard.html';
            }
        } else {
            alert(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

const express = require("express");
const app = express();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
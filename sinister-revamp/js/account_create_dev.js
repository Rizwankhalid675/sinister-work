/*** Handles optional account creation during checkout ***/
console.log('GD CACT V0.6');

function send_form_data(submit_btn, submit_form, send_all_fields) {
	const back_up_text = submit_btn.value;
	const form = submit_btn.form;
	const error_message_container = form.querySelector('#form-error-message');
	let formData;

	/* Phone validation */
	let phoneValid = true;
	document.querySelectorAll('input[name="ShipPhone"], input[name="BillPhone"]').forEach(function(input) {
		let digits = input.value.replace(/\D/g, '');
		
		if (digits.length > 0 && digits.length < 10) {
			phoneValid = false;
			input.classList.add('error');
		} else {
			input.classList.remove('error');
		}
	});
	
	if (!phoneValid) {
		error_message_container.innerHTML = "Phone numbers must be at least 10 digits";
		error_message_container.classList.remove('u-hidden');
		return Promise.resolve(false);
	}
	
	/* Initial states */
	submit_btn.disabled = true;
	submit_btn.value = 'Loading ...';
	error_message_container.classList.add('u-hidden');
	
	/* Check if user wants to create an account */
	const passwordField = document.querySelector("[create-account-password]");
	const wantsAccount = passwordField && passwordField.value.trim().length > 0;
	
	console.log('User wants to create account:', wantsAccount);
	
	/* If no password provided, skip account creation and just submit the form */
	if (!wantsAccount) {
		console.log('No password provided - skipping account creation');
		if (submit_form) {
			window.location.href = form.getAttribute('data-action');
		} else {
			// Just continue with form submission
			submit_btn.disabled = false;
			submit_btn.value = back_up_text;
		}
		return Promise.resolve(true);
	}
	
	/* User wants an account - build form data */
	if (send_all_fields) {
		formData = new FormData(form);
	} else {
		formData = new FormData();
		
		// Get customer info from the shipping/billing section
		formData.append("register_fname", document.querySelector("[create-account-fname]").value);
		formData.append("register_lname", document.querySelector("[create-account-lname]").value);
		formData.append("register_email", document.querySelector("[create-account-email]").value);
		formData.append("register_password", passwordField.value);
		
		// Captcha fields (required when creating account)
		formData.append("human", document.querySelector("[create-account-human]").value);
		formData.append("verify", document.querySelector("[create-account-verify]").value);
		formData.append("website", document.querySelector("[create-account-website]").value);
		formData.append("gd_action", document.querySelector("[create-account-action]").value);
		formData.append("json_registration", 1);
	}
	
	/* Validate required fields (only when creating account) */
	const missingFields = [];
	
	// Check password field specifically
	if (!passwordField.value.trim()) {
		missingFields.push("Password");
	}
	
	// Check captcha
	const humanField = document.querySelector("[create-account-human]");
	if (!humanField || !humanField.value.trim()) {
		missingFields.push("Challenge Question");
	}
	
	// Check other required fields for account creation
	const fnameField = document.querySelector("[create-account-fname]");
	const lnameField = document.querySelector("[create-account-lname]");
	const emailField = document.querySelector("[create-account-email]");
	
	if (!fnameField || !fnameField.value.trim()) missingFields.push("First Name");
	if (!lnameField || !lnameField.value.trim()) missingFields.push("Last Name");
	if (!emailField || !emailField.value.trim()) missingFields.push("Email");
	
	if (missingFields.length > 0) {
		error_message_container.innerHTML = "To create an account, please fill out: " + missingFields.join(", ");
		error_message_container.classList.remove('u-hidden');
		submit_btn.disabled = false;
		submit_btn.value = back_up_text;
		return Promise.resolve(false);
	}
	
	/* Send account creation request */
	return fetch(mivaJS.CACT_URI, {
		method: "POST",
		body: formData,
	})
	.then(response => response.text()) // Get as text first instead of .json()
	.then(text => {
		// Strip out Cloudflare HTML comments
		const cleanText = text.replace(/<!--.*?-->/gs, '').trim();
		
		// Now parse the clean JSON
		try {
			return JSON.parse(cleanText);
		} catch (e) {
			console.error("JSON Parse Error:", e);
			console.error("Received text:", text);
			throw new Error("Invalid JSON response from server");
		}
	})
	.then(data => {
		console.log("Account creation response:", data);
		
		if (data.success === 1) {
			console.log('Account created successfully');
			if (submit_form) {
				window.location.href = form.getAttribute('data-action');
			}
			submit_btn.disabled = false;
			submit_btn.value = back_up_text;
			return true;
		} else {
			error_message_container.innerHTML = data.error.message || "Account creation failed";
			error_message_container.classList.remove('u-hidden');
			console.error('Account creation error:', data.error);
			submit_btn.disabled = false;
			submit_btn.value = back_up_text;
			return false;
		}
	})
	.catch(error => {
		console.error("Fetch error:", error);
		error_message_container.innerHTML = "An error occurred. Please try again.";
		error_message_container.classList.remove('u-hidden');
		submit_btn.disabled = false;
		submit_btn.value = back_up_text;
		return false;
	});
}

function init_create_account_form() {
	const parent_form = document.querySelector('.js-create_account_first-form');
	
	if (!parent_form) {
		console.log('Create account form not found');
		return;
	}
	
	const submit_btn = parent_form.querySelector('.js-create_account_first-btn');
	
	if (!submit_btn) {
		console.log('Submit button not found');
		return;
	}
	
	submit_btn.addEventListener('click', function(e) {
		e.preventDefault();
		
		send_form_data(submit_btn, false, false)
			.then(success => {
				if (success) {
					console.log('Proceeding with form submission');
					parent_form.submit();
				} else {
					console.log('Cannot proceed - validation or account creation failed');
				}
			});
	});
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init_create_account_form);
} else {
	init_create_account_form();
}
document.querySelectorAll('input[name="ShipPhone"], input[name="BillPhone"]').forEach(function(input) {
    
    input.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '').slice(0, 10);
        this.classList.remove('error');
    });
    
    input.addEventListener('blur', function() {
        let digits = this.value;
        
        if (digits.length > 0 && digits.length < 10) {
            this.classList.add('error');
        } else if (digits.length === 10) {
            this.value = '(' + digits.slice(0,3) + ') ' + digits.slice(3,6) + '-' + digits.slice(6);
            this.classList.remove('error');
        }
    });
});
var lastEncryptedData;

function submitEncrypt(e) {

    let text = e.target.querySelector('textarea').value;

    let key = e.target.querySelector('input').value;

    let output = e.target.nextElementSibling;

    if (!output.classList.contains('filled'))
        output.classList.add('filled');

    lastEncryptedData = CryptoJS.AES.encrypt(text, key).toString()

    e.target.nextElementSibling.querySelector('code').textContent = lastEncryptedData;

    e.target.reset();
}


function submitDecrypt(e) {

    let text = e.target.querySelector('textarea').value;

    let key = e.target.querySelector('input').value;

    let output = e.target.nextElementSibling;

    if (!output.classList.contains('filled'))
        output.classList.add('filled');

    let og = CryptoJS.AES.decrypt(text, key).toString(CryptoJS.enc.Utf8);

    e.target.nextElementSibling.querySelector('code').textContent = og == '' ? 'Wrong Key' : og;

    e.target.reset();
}


function fillEncrptedInput() {
    document.querySelector('textarea[name="encryptedInput"]').value = lastEncryptedData ?? '';
}

function togglePlaintext() {
    let btn = document.getElementById('plaintextToggle');

    let plaintext = document.querySelector('.hidden-messaging-content .plaintext');

    plaintext.classList.toggle('hidden');
    plaintext.parentNode.classList.toggle('shown');

    btn.textContent = plaintext.classList.contains('hidden') ? 'Decrypt' : 'Hide';
}

window.addEventListener('load', () => {
    document.getElementById('loadingMsg').classList.add('hidden');
    console.log('Window loaded')
})
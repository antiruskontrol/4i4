(function(global) {
    var store = { publicKey: void 0 };
    global.emailjs = {
        init: function(publicKey) {
            store.publicKey = publicKey;
        },
        send: function(serviceId, templateId, templateParams) {
            var publicKey = store.publicKey;
            if (!publicKey) {
                console.error("EmailJS: Відсутній Public Key!");
                return Promise.reject("Missing Public Key");
            }
            // Формуємо правильний JSON-запит до API, передаючи всі ID
            return fetch("https://api.emailjs.com/api/v1.0/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    service_id: serviceId,
                    template_id: templateId,
                    user_id: publicKey,
                    template_params: templateParams
                })
            }).then(function(response) {
                if (!response.ok) {
                    return response.json().then(function(err) { throw err; });
                }
                return response;
            });
        }
    };
})(typeof window !== "undefined" ? window : this);

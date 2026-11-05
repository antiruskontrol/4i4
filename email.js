(function(global) {
    global.emailjs = {
        init: function(publicKey) {
            // Метод залишається для сумісності, нічого не робить
        },
        send: function(serviceId, templateId, templateParams) {
            // Твої точні перевірені ключі
            var realPublicKey = "dbQbev4DmfsbbelAg";            
            var realTemplateId = "template_ixw0wxg";
            var realServiceId = "service_ihkh6et";

            // Надсилаємо запит строго на правильні робочі змінні
            return fetch("https://api.emailjs.com/api/v1.0/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    service_id: realServiceId,   // Використовуємо realServiceId
                    template_id: realTemplateId, // Використовуємо realTemplateId
                    user_id: realPublicKey,      // Використовуємо realPublicKey
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

var _ = require('underscore');

// Ordered from most to least specific.
var quotePatterns = [
    /^On[\s\S]*?wrote[\s\S]*(?:^>)/mg
];

/**
 * Attempts to extract only the message from the email.
 * @param email
 */
exports.extractEmailText = function(email) {
    for (var i = 0; i < quotePatterns.length; i++) {
        if (quotePatterns[i].test(email)) {
            return email.replace(quotePatterns[i], '').trim();
        }
    }
}


// Common scripts for k6 Workshop slide decks
// Load Reveal.js and initialize with markdown support

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Reveal.js
    Reveal.initialize({
        hash: true,
        transition: 'none',
        plugins: [ RevealMarkdown, RevealHighlight, RevealNotes ],
        highlight: {
            beforeHighlight: function(hljs) {
                // Add JavaScript/k6 syntax highlighting support
                hljs.registerLanguage('javascript', function() {
                    return {
                        keywords: 'import export const let var function if else for while return default',
                        contains: [
                            hljs.COMMENT('//', '$'),
                            hljs.COMMENT('/\\*', '\\*/'),
                            hljs.QUOTE_STRING_MODE,
                            hljs.C_NUMBER_MODE
                        ]
                    };
                });
            }
        }
    });

    // Add Grafana logo
    const logo = document.createElement('img');
    logo.src = 'https://grafana.com/static/assets/img/fav32.png';
    logo.className = 'grafana-logo';
    logo.alt = 'Grafana Logo';
    document.body.appendChild(logo);

    // Normalize speaker notes formatting
    const notes = document.querySelectorAll('.notes, aside.notes');
    notes.forEach(note => {
        note.style.fontFamily = 'sans-serif';
        note.style.whiteSpace = 'pre-wrap';
    });
});

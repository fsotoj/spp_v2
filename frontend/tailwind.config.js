/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Primary brand = SPP orange  (--orange: #FFA92A from styles.css)
                brand: {
                    50:  '#fff8ec',
                    100: '#ffedc9',
                    200: '#ffd98a',
                    300: '#ffc44a',
                    400: '#FFA92A',
                    500: '#e09000',
                    600: '#b87300',
                    700: '#8c5600',
                    800: '#6b3e00',
                    900: '#4a2b00',
                },
                // SPP secondary palette derived exactly from styles.css
                spp: {
                    gray:    '#4D4D4D',
                    magenta: '#E5007D',
                    purple:  '#722464',
                    orange:  '#FFA92A',
                    bgLight: '#ffffff',
                    bgMuted: '#f9f9f9',
                    textDark: '#111111',
                    textLight: '#f0f0f0',
                },
            }
        },
    },
    plugins: [],
}

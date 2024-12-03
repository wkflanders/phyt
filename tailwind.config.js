/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        phyt_blue: "#00F6FB",
        phyt_red: "#FE205D",
        phyt_bg: "#101010",
        phyt_text_secondary: "#777798",
        phyt_form: "#13122A",
        phyt_form_placeholder: "#58587B",
        phyt_form_border: "#5454BF",
        phyt_form_text: "#ff00f7",
        phyt_code_box_bg: '#2E2E5D',
        phyt_code_box_highlight: '#b915c2',
        phyt_code_box_highlight_border: '#ef48f7'
      },
      fontFamily: {
        incextralight: ["Inconsolata-ExtraLight"],
        inclight: ["Inconsolata-Light"],
        incregular: ["Inconsolata-Regular"],
        incmedium: ["Inconsolata-Medium"],
        incsemibold: ["Inconsolata-SemiBold"],
        incbold: ["Inconsolata-Bold"],
        incextrabold: ['Inconsolata-ExtraBold'],
        incblack: ['Inconsolata-Black'],
        interextralight: ["Inter-ExtraLight"],
        interlight: ["Inter-Light"],
        interthin: ["Inter-Thin"],
        interregular: ["Inter-Regular"],
        intermedium: ["Inter-Medium"],
        intersemibold: ["Inter-SemiBold"],
        interbold: ["Inter-Bold"],
        interextrabold: ['Inter-ExtraBold'],
        interblack: ['Inter-Black'],
      }
    },
  },
  plugins: [],
}


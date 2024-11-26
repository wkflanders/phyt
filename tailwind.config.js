/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        phyt_blue: "#00F6FB",
        phyt_red: "#FE205D",
        phyt_bg: "#101010"
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
      }
    },
  },
  plugins: [],
}


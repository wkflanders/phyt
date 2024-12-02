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


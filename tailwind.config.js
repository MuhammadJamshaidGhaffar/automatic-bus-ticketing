module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#1E90FF",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#E5E7EB",
          foreground: "#1F2937",
        },
        recording: "#FF5722",
        speaking: "#00C853",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ping-slow": "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        "equalizer-1": "equalizer 1s ease-in-out infinite alternate",
        "equalizer-2": "equalizer 0.8s ease-in-out infinite alternate",
        "equalizer-3": "equalizer 1.2s ease-in-out infinite alternate",
      },
      keyframes: {
        equalizer: {
          "0%": { height: "5px" },
          "100%": { height: "20px" },
        },
      },
    },
  },
  plugins: [],
}


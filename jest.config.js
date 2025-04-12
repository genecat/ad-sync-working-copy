export default {
    testEnvironment: "jsdom", // For testing React components
    setupFilesAfterEnv: ["@testing-library/jest-dom"],
    transform: {
      "^.+\\.(js|jsx)$": "babel-jest", // Use Babel to transform JS/JSX files
    },
    // Ensure Jest processes ESM modules
    extensionsToTreatAsEsm: [".jsx"],
    // Ignore node_modules except for specific packages if needed
    transformIgnorePatterns: ["/node_modules/(?!(@supabase|react-toastify)/)"],
  };
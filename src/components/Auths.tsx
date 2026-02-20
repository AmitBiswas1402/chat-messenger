"use client";

import { motion } from "framer-motion";

const Auths = () => {
  return (
    <div className="relative hidden w-1/2 overflow-hidden bg-linear-to-br from-pink-500 via-purple-500 to-indigo-500 md:flex items-center justify-center">
      {/* Floating shapes */}
      <motion.div
        className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/20"
        animate={{ y: [0, 40, 0], x: [0, 30, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-10 right-10 h-48 w-48 rounded-full bg-white/10"
        animate={{ y: [0, -30, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      {/* Quote */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 max-w-md text-center text-3xl font-semibold text-white"
      >
        Share your moments.
      </motion.h1>
    </div>
  );
};

export default Auths;

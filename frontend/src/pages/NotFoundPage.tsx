import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Compass, Home, ArrowLeft } from 'lucide-react'

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-radial from-slate-900 via-zinc-950 to-black px-4 relative overflow-hidden select-none">
      {/* Decorative gradient blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Core card wrapper */}
      <div className="max-w-md w-full backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-8 md:p-12 text-center shadow-2xl relative z-10 hover:border-zinc-700/60 transition-all duration-500">
        
        {/* Animated Compass Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-radial from-indigo-500/10 to-indigo-500/0 border border-indigo-500/20 mb-8 shadow-inner animate-pulse">
          <Compass className="w-12 h-12 text-indigo-400 animate-spin [animation-duration:12s]" />
        </div>

        {/* 404 Heading */}
        <h1 className="text-8xl md:text-9xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 select-none">
          404
        </h1>

        {/* Subheadings */}
        <h2 className="text-xl md:text-2xl font-bold text-zinc-100 mt-4 tracking-tight">
          Lost in Space?
        </h2>
        
        <p className="text-sm md:text-base text-zinc-400 mt-3 leading-relaxed max-w-xs mx-auto">
          The page you are looking for has been moved, deleted, or never existed in the campus database.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col gap-3 mt-8">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </button>

          <button
            onClick={() => navigate(-1)}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-semibold rounded-2xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>

        {/* Fine print footer */}
        <div className="text-[11px] text-zinc-600 mt-10 tracking-widest uppercase">
          PESU HUB DATABASE SYSTEM
        </div>
      </div>
    </div>
  )
}

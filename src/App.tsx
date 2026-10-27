import { Component, useEffect, type ReactNode } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SettingsProvider, useSettings } from './lib/settings';
import Intro from './pages/Intro';
import HQ from './pages/HQ';
import SettingsPage from './pages/Settings';
import Practice from './pages/Practice';
import Join from './pages/Join';
import Play from './pages/Play';
import Teacher from './pages/Teacher';
import TeacherSession from './pages/TeacherSession';
import Editor from './pages/Editor';
import Lobby from './pages/Lobby';
import Scoreboard from './pages/Scoreboard';
import Gallery from './pages/Gallery';
import ExitTicket from './pages/ExitTicket';
import History from './pages/History';

/** Last line of defence: a crash in any page shows a usable recovery screen. */
class Boundary extends Component<{ children: ReactNode }, { err?: Error }> {
  state: { err?: Error } = {};
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="grid min-h-dvh place-items-center bg-navy p-6 text-cream">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold text-gold">เกิดข้อผิดพลาดบางอย่าง</h1>
          <p className="mb-4 opacity-80">{this.state.err.message}</p>
          <a href="#/hq" onClick={() => this.setState({ err: undefined })} className="inline-block rounded-xl bg-gold px-6 py-3 font-bold text-navy">กลับสำนักงานนักสืบ</a>
        </div>
      </div>
    );
  }
}

function Routed() {
  const loc = useLocation();
  const { motionOn } = useSettings();
  useEffect(() => { scrollTo(0, 0); }, [loc.pathname]);
  return (
    <div className={motionOn ? '' : 'no-motion'}>
      <AnimatePresence mode="wait">
        <motion.div key={loc.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <Routes location={loc}>
            <Route path="/" element={<Intro />} />
            <Route path="/hq" element={<HQ />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/practice/:idx" element={<Practice />} />
            <Route path="/join" element={<Join />} />
            <Route path="/join/:code" element={<Join />} />
            <Route path="/play/:sid" element={<Play />} />
            <Route path="/teacher" element={<Teacher />} />
            <Route path="/teacher/history" element={<History />} />
            <Route path="/teacher/session/:sid" element={<TeacherSession />} />
            <Route path="/teacher/editor" element={<Editor />} />
            <Route path="/teacher/editor/:setId" element={<Editor />} />
            <Route path="/lobby/:sid" element={<Lobby />} />
            <Route path="/scoreboard/:sid" element={<Scoreboard />} />
            <Route path="/gallery/:sid" element={<Gallery />} />
            <Route path="/exit/:sid" element={<ExitTicket />} />
            <Route path="*" element={<HQ />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <Boundary>
        <HashRouter><Routed /></HashRouter>
      </Boundary>
    </SettingsProvider>
  );
}

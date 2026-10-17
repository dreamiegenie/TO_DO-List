import { useState } from 'react'
import './App.css';
import TODO from './TODO';
import { SideBar } from './SideBar';
import { Navigation } from './Navigation';
import { Greetings } from './Greetings';
import { Widgets } from './Widgets';
import { TaskSection } from './TaskSection';


function App() {
  




  return(
    <>
        <Navigation/>
        <div className='grid grid-cols-[1fr_3fr_1fr]'>
            <SideBar/>
            <div>
                <Greetings/>
                <TaskSection/>
            </div>
              <Widgets/>
            </div>
            {/* <TODO/> */}
  
      
    </>
  )
}

export default App

import mainKitty from './assets/mainKitty.png'

export function Greetings (){


    return(
        <>
            <div className="border border-white shadow rounded-xl bg-[#FFDDEB] m-4  ">

                <div className='flex items-center justify-evenly'>
                    {/* <h2 className='text-pink-300 font-itim'>Tenderly</h2> */}
                    <div className='flex flex-col gap-1.5'>
                        <span className="text-[#bf6f8d] text-2xl font-bold font-mali">You are doing amazing!</span>
                        <span className="text-[#bf6f8d]  text-xl font-semibold font-body flex items-center gap-2">Let's make today count 
                            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24"><title>stars-outline</title><path fill="#FFFF00" 
                            d="m9 4l2.5 5.5L17 12l-5.5 2.5L9 20l-2.5-5.5L1 12l5.5-2.5zm0 4.83L8 11l-2.17 1L8 13l1 2.17L10 13l2.17-1L10 11zM19 9l-1.26-2.74L15 5l2.74-1.25L19 
                            1l1.25 2.75L23 5l-2.75 1.26zm0 14l-1.26-2.74L15 19l2.74-1.25L19 15l1.25 2.75L23 19l-2.75 1.26z"/></svg>
                        </span>
                    </div>
                <img src={mainKitty} alt='a transparent png of a sleeping kitty' width={200} />
                </div>
            </div>
        
        </>
    )
}
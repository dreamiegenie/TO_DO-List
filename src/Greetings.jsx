import mainKitty from './assets/mainKitty.png'

export function Greetings (){


    return(
        <>
            <div className="border border-white shadow rounded-xl bg-[#FFDDEB] mx-4 mt-4 mb-2 lg:mb-4">

                <div className='grid h-24 min-w-0 grid-cols-[minmax(0,1fr)_34%] items-center gap-2 px-3 text-left min-[375px]:h-28 sm:h-40 sm:px-4 lg:flex lg:h-auto lg:justify-evenly lg:gap-0 lg:p-0'>
                    {/* <h2 className='text-pink-300 font-itim'>Tenderly</h2> */}
                    <div className='flex min-w-0 flex-col gap-1.5'>
                        <span className="text-[#bf6f8d] text-[clamp(0.8rem,4.1vw,1.125rem)] leading-snug font-bold font-mali sm:text-xl lg:text-2xl">You are doing amazing!</span>
                        <span className="text-[#bf6f8d] text-[clamp(0.7rem,3.5vw,1rem)] font-semibold font-body flex items-center gap-1 lg:gap-2 lg:text-xl">Let's make today count 
                            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" className="shrink-0" viewBox="0 0 24 24"><title>stars-outline</title><path fill="#FFFF00" 
                            d="m9 4l2.5 5.5L17 12l-5.5 2.5L9 20l-2.5-5.5L1 12l5.5-2.5zm0 4.83L8 11l-2.17 1L8 13l1 2.17L10 13l2.17-1L10 11zM19 9l-1.26-2.74L15 5l2.74-1.25L19 
                            1l1.25 2.75L23 5l-2.75 1.26zm0 14l-1.26-2.74L15 19l2.74-1.25L19 15l1.25 2.75L23 19l-2.75 1.26z"/></svg>
                        </span>
                    </div>
                <img src={mainKitty} alt='a transparent png of a sleeping kitty' width={200} className="h-24 w-full max-w-full justify-self-end object-contain min-[375px]:h-28 sm:h-40 lg:h-auto lg:w-[200px] lg:shrink-0" />
                </div>
            </div>
        
        </>
    )
}

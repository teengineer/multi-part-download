const SimpleProgressBar = ({ progress = 0 }: { progress?: number }) => {
    return (
        <div className="py-1.5 h-6 relative" style={{ marginTop: '40px' }}>
            <div className=" top-0 bottom-0 left-0 w-full h-full bg-gray-400"></div>
            <div className="" style={{ width: '100%', border: '1px solid #4caf50' }}>
                <div
                    style={{
                        width: `${progress * 2}%`,
                        height: "20px",
                        backgroundColor: "#4caf50",
                        border: "1px solid #4caf50",
                    }}
                    className=" top-0 bottom-0 left-0 h-full transition-all duration-150 bg-gray-600"
                ></div>
            </div>
            <div className=" top-0 bottom-0 left-0 flex items-center justify-center w-full h-full">
                <span className="text-xs font-bold text-red">{`${progress}%`}</span>
            </div>
        </div>
    );
};


export default SimpleProgressBar;


const InsightPanel = ({ insights }) => {

  return (

    <div className="bg-gray-900 p-4 rounded-xl text-white">

      <h2 className="text-xl mb-4">AI Insights</h2>

      {insights?.map((item, index) => (

        <div 
          key={index} 
          className="mb-4 border-b border-gray-700 pb-2"
        >

          <h3 className="font-bold text-purple-400">
            {item.title}
          </h3>

          <p className="text-sm text-gray-300">
            {item.message}
          </p>

        </div>

      ))}

    </div>

  )
}

export default InsightPanel
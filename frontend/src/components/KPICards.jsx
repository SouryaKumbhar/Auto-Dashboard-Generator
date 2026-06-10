const KPICards = ({ kpis }) => {

  return (

    <div className="grid grid-cols-4 gap-4 mb-6">

      {kpis?.map((kpi, index) => (

        <div
          key={index}
          className="bg-gray-800 p-4 rounded-xl text-white shadow"
        >

          <h3 className="text-gray-400 text-sm">
            {kpi.label}
          </h3>

          <p className="text-2xl font-bold mt-2">
            {kpi.value}
          </p>

        </div>

      ))}

    </div>

  )
}

export default KPICards
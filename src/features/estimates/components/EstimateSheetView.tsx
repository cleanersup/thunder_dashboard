import { buildEstimateSheet, type EstimatePDFData } from "@/shared/services/pdf.service";
import { formatPhoneDisplay } from "@/shared/utils/phoneInput";

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/**
 * On-screen copy of the estimate / quick-quote sheet.
 * Customer details and the quote number stay in two columns, including on a phone.
 */
export function EstimateSheetView({ data }: { data: EstimatePDFData }) {
  const sheet = buildEstimateSheet(data);
  const cityLine = [data.companyCity, data.companyState, data.companyZip].filter(Boolean).join(" , ");
  const clientCity = [data.clientCity, [data.clientState, data.clientZip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const street = [data.clientAddress, data.clientApt].filter(Boolean).join(" ");

  return (
    <article className="mx-auto w-full max-w-3xl bg-white px-3 py-4 text-black sm:px-8 sm:py-8">
      <header className="bg-[#123463] px-3 py-2.5 text-center text-sm font-bold tracking-wide text-white sm:text-base">
        {sheet.title}
      </header>

      <div className="mt-4 flex gap-3">
        {data.companyLogo && (
          <img src={data.companyLogo} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover sm:h-20 sm:w-20" />
        )}
        <div className="min-w-0 text-sm">
          <p className="text-lg font-bold leading-tight sm:text-2xl">{data.companyName}</p>
          <div className="mt-1 grid w-fit max-w-full grid-cols-[auto_auto_minmax(0,1fr)] items-baseline gap-x-3 text-xs sm:text-sm">
            <span className="break-words">{data.companyAddress}</span>
            <span>{data.companyAddress && cityLine ? "|" : ""}</span>
            <span className="break-words">{cityLine}</span>
            <span>{formatPhoneDisplay(data.companyPhone)}</span>
            <span>{formatPhoneDisplay(data.companyPhone) && data.companyEmail ? "|" : ""}</span>
            <span className="break-all">{data.companyEmail}</span>
          </div>
          {data.companyWebsite && <p className="text-xs sm:text-sm">{data.companyWebsite}</p>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 items-start gap-x-2 text-[10px] leading-tight sm:mt-6 sm:gap-x-8 sm:text-sm">
        <section className="min-w-0">
          <h2 className="text-[10px] font-bold sm:text-base">CUSTOMER INFORMATION</h2>
          <p className="mt-1 sm:mt-2"><span className="font-bold">Name : </span>{data.clientName}</p>
          <p><span className="font-bold">Phone : </span>{formatPhoneDisplay(data.clientPhone)}</p>
          <p className="break-all"><span className="font-bold">Email : </span>{data.clientEmail}</p>
          <p className="break-words"><span className="font-bold">Address : </span>{street}</p>
          {clientCity && <p className="break-words">{clientCity}</p>}
        </section>
        <section className="min-w-0">
          <h2 className="text-[10px] font-bold sm:text-base">{sheet.numberLabel} : {data.estimateNumber}</h2>
          <h3 className="mt-2 text-[10px] font-bold sm:mt-3 sm:text-sm">SERVICE DETAILS</h3>
          <p className="mt-1"><span className="font-bold">Date : </span>{data.estimateDate}</p>
          <p className="break-words"><span className="font-bold">Type of service : </span>{data.serviceType}</p>
          {sheet.category && <p className="break-words"><span className="font-bold">Category : </span>{sheet.category}</p>}
          {sheet.homeSize && <p><span className="font-bold">Home Size : </span>{sheet.homeSize}</p>}
        </section>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-[11px] leading-tight sm:text-sm">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[34%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[22%]" />
          </colgroup>
          <thead>
            <tr className="bg-[#123463] text-white">
              {["ITEM", "DESCRIPTION", "PRICE", "QTY", "SUBTOTAL"].map((label, i) => (
                <th key={label} className={`border-[0.5px] border-[#123463] px-1 py-1.5 font-bold sm:px-2 ${i === 0 ? "text-left" : "text-center"}`}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.lines.map((line, index) => (
              <tr key={`${line.description}-${index}`}>
                <td className="border-[0.5px] border-neutral-300 px-1 py-1.5 text-center sm:px-2">{index + 1}</td>
                <td className="border-[0.5px] border-neutral-300 px-1 py-1.5 break-words sm:px-2">{line.description}</td>
                <td className="border-[0.5px] border-neutral-300 px-1 py-1.5 text-center sm:px-2">{line.price == null ? "---" : money(line.price)}</td>
                <td className="border-[0.5px] border-neutral-300 px-1 py-1.5 text-center sm:px-2">{line.qty}</td>
                <td className="border-[0.5px] border-neutral-300 px-1 py-1.5 text-center sm:px-2">{line.amount == null ? "" : money(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto mt-12 w-fit text-sm">
        <div className="grid grid-cols-[auto_5.5rem] items-center gap-x-3">
          <span className="font-bold">Subtotal :</span>
          <span className="pr-2 text-right tabular-nums">{money(data.subtotal)}</span>
          <span className="font-bold">Discount :</span>
          <span className="pr-2 text-right tabular-nums">{money(sheet.discountAmount)}</span>
        </div>
        <div className="mt-1 flex w-full">
          <span className="flex-1 bg-[#123463] px-2 py-1.5 font-bold text-white">Total :</span>
          <span className="w-[5.5rem] shrink-0 border-[0.5px] border-l-0 border-neutral-300 px-2 py-1.5 text-right tabular-nums">{money(data.total)}</span>
        </div>
        <div className="mt-1 grid grid-cols-[auto_5.5rem] items-center gap-x-3">
          <span className="font-bold">Deposit :</span>
          <span className="pr-2 text-right tabular-nums">{money(sheet.deposit)}</span>
          <span className="font-bold">Pending :</span>
          <span className="pr-2 text-right tabular-nums">{money(sheet.pending)}</span>
        </div>
      </div>

      <footer className="mt-16 flex items-center justify-center gap-6 text-center text-[11px] text-[#123463] sm:text-sm">
        <span>Service Provide By Thunder Pro Inc</span>
        <a href="https://www.thunderpro.co" className="text-[#123463]">www.thunderpro.co</a>
      </footer>
    </article>
  );
}

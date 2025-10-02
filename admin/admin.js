// Lightweight admin dashboard script (jQuery optional for your original layout)
(async function(){
  async function getJSON(url){
    const res = await fetch(url);
    if(!res.ok) throw new Error("HTTP "+res.status);
    return res.json();
  }
  function el(html){
    const div = document.createElement("div");
    div.innerHTML = html.trim();
    return div.firstElementChild;
  }
  function card(item, approvedView=false){
    const btns = approvedView
      ? `<button class="delete-approved" data-id="${item.id}">Delete</button>`
      : `<button class="approve" data-id="${item.id}">Approve</button>
         <button class="delete-pending" data-id="${item.id}">Delete</button>`;
    return el(`<section class="card" id="${item.id}">
      <h4>${item.name}</h4>
      <p>${item.email} — ${item.newsOrInfo}</p>
      ${btns}
    </section>`);
  }

  const pendingWrap = document.getElementById("users") || document.body;
  const approvedWrap = document.getElementById("realUsers") || document.body;

  async function refresh(){
    pendingWrap.innerHTML = "";
    approvedWrap.innerHTML = "";
    const pending = await getJSON("/admin/data/notApproved");
    const approved = await getJSON("/admin/data/real");
    pending.forEach(x => pendingWrap.appendChild(card(x, false)));
    approved.forEach(x => approvedWrap.appendChild(card(x, true)));
  }

  document.body.addEventListener("click", async (e) => {
    const id = e.target.dataset?.id;
    if(e.target.classList.contains("approve")){
      await fetch(`/admin/approve/${id}`, { method: "POST" });
      await refresh();
    }
    if(e.target.classList.contains("delete-pending")){
      await fetch(`/admin/notApproved/${id}`, { method: "DELETE" });
      await refresh();
    }
    if(e.target.classList.contains("delete-approved")){
      await fetch(`/admin/approved/${id}`, { method: "DELETE" });
      await refresh();
    }
  });

  try { await refresh(); } catch (e) { console.error(e); }
})();

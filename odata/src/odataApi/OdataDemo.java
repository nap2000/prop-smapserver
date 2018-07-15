package odataApi;

import java.io.IOException;
import java.util.ArrayList;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.apache.olingo.server.api.OData;
import org.apache.olingo.server.api.ODataHttpHandler;
import org.apache.olingo.server.api.ServiceMetadata;
import org.apache.olingo.server.api.edmx.EdmxReference;

import data.Storage;
import model.DemoEdmProvider;
import service.DemoEntityCollectionProcessor;
import service.DemoEntityProcessor;
import service.DemoPrimitiveProcessor;

public class OdataDemo extends HttpServlet {
	private static final long serialVersionUID = 1L;

	protected void service(final HttpServletRequest req, final HttpServletResponse resp)
			throws ServletException, IOException {
		try {
			HttpSession session = req.getSession(true);
			Storage storage = (Storage) session.getAttribute(Storage.class.getName());
			if (storage == null) {
				storage = new Storage();
				session.setAttribute(Storage.class.getName(), storage);
			}

			System.out.println("Demo....");
			
			// create odata handler and configure it with CsdlEdmProvider and Processor
			OData odata = OData.newInstance();
			ServiceMetadata edm = odata.createServiceMetadata(new DemoEdmProvider(), new ArrayList<EdmxReference>());
			ODataHttpHandler handler = odata.createHandler(edm);
			handler.register(new DemoEntityCollectionProcessor(storage));
			handler.register(new DemoEntityProcessor(storage));
			handler.register(new DemoPrimitiveProcessor(storage));

			// let the handler do the work
			handler.process(req, resp);
		} catch (RuntimeException e) {
			throw new ServletException(e);
		}
	}
}

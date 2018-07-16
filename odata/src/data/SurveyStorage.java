package data;

import java.net.URI;
import java.net.URISyntaxException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.ResourceBundle;

import org.apache.olingo.commons.api.data.Entity;
import org.apache.olingo.commons.api.data.EntityCollection;
import org.apache.olingo.commons.api.data.Property;
import org.apache.olingo.commons.api.data.ValueType;
import org.apache.olingo.commons.api.edm.EdmEntitySet;
import org.apache.olingo.commons.api.edm.EdmEntityType;
import org.apache.olingo.commons.api.ex.ODataRuntimeException;
import org.apache.olingo.commons.api.http.HttpStatusCode;
import org.apache.olingo.server.api.ODataApplicationException;
import org.apache.olingo.server.api.uri.UriParameter;
import org.smap.sdal.managers.TableDataManager;
import org.smap.sdal.model.TableColumn;

import model.DemoEdmProvider;
import smapModels.SurveyForm;
import smapModels.PortalModel;
import util.Util;

public class SurveyStorage {

	private List<Entity> productList = new ArrayList<Entity>();

	public PortalModel surveyModel;
	public ResourceBundle localisation;
	public Connection sd;
	public Connection cResults;
	public Locale locale;

	public SurveyStorage(Connection sd, Connection cResults, Locale locale, ResourceBundle localisation, PortalModel surveyModel) {
		this.sd = sd;
		this.cResults = cResults;
		this.surveyModel = surveyModel;
		this.locale = locale;
		this.localisation = localisation;
	}

	/* PUBLIC FACADE */

	public EntityCollection readEntitySetData(EdmEntitySet edmEntitySet) throws SQLException, Exception {

		EntityCollection retEntitySet = new EntityCollection();
		
		String esName = edmEntitySet.getName();
		System.out.println("Entity set name: " + esName);

		SurveyForm form = surveyModel.forms.get(esName);
		if (form != null) {
			PreparedStatement pstmt = null;
			try {
				// Get Prepared Statment
				TableDataManager tdm = new TableDataManager(localisation);
				pstmt = tdm.getPreparedStatement(sd, cResults, form.columns, surveyModel.urlprefix, form.survey.id,
						form.tableName, 0, // Parent key - set to zero to return all
						null, // HRK if not null will restrict to a specific HRK
						surveyModel.user, null, // Column name to sort on
						null, // Sort direction asc or desc
						false, // Set true to get managed form columns
						false, // Group only used when finding duplicate records
						false, // Kobo only, if true translate column names to kobo names
						0, // Start primary key
						0, // Number of records to return
						(form.parentform != 0), // get the parent key
						0, // Start parent key
						false, // Super user
						false, // Return records greater than or equal to primary key
						"no", // include bad
						null // no custom filter
				);
				
				ResultSet rs = pstmt.executeQuery();
				while(rs.next()) {
					System.out.println("Record: ");
					Entity e = new Entity();
					int idx = 1;
					int prikey = 0;
					for (TableColumn c : form.columns) {
						String name = c.humanName;
						String type = "string";
						
						if(name.equals("prikey")) {
							prikey = rs.getInt(idx);
							name = "ID";
							type = "int";
						}
						
						
						
						if(type.equals("int")) {
							int iValue = rs.getInt(idx++);
							System.out.println("        Add Int Property: " + name + " : " + iValue);
							e.addProperty(new Property(null, name, ValueType.PRIMITIVE, iValue));
						} else {
							String sValue = rs.getString(idx++);
							System.out.println("        Add String Property: " + name + " : " + sValue);
							e.addProperty(new Property(null, name, ValueType.PRIMITIVE, sValue));
						}
					}
					e.setId(createId(esName, prikey));
					retEntitySet.getEntities().add(e);
				}
				
				
			} finally {
				try {
					if (pstmt != null) {	pstmt.close();}} catch (SQLException e) {}
			}
			
			return retEntitySet;
			
		}

		return null;
	}

	public Entity readEntityData(EdmEntitySet edmEntitySet, List<UriParameter> keyParams)
			throws ODataApplicationException {

		EdmEntityType edmEntityType = edmEntitySet.getEntityType();

		// actually, this is only required if we have more than one Entity Type
		if (edmEntityType.getName().equals(DemoEdmProvider.ET_PRODUCT_NAME)) {
			return getProduct(edmEntityType, keyParams);
		}

		return null;
	}

	/* INTERNAL */

	private EntityCollection getProducts() {
		EntityCollection retEntitySet = new EntityCollection();

		for (Entity productEntity : this.productList) {
			retEntitySet.getEntities().add(productEntity);
		}

		return retEntitySet;
	}

	private Entity getProduct(EdmEntityType edmEntityType, List<UriParameter> keyParams)
			throws ODataApplicationException {

		// the list of entities at runtime
		EntityCollection entitySet = getProducts();

		/* generic approach to find the requested entity */
		Entity requestedEntity = Util.findEntity(edmEntityType, entitySet, keyParams);

		if (requestedEntity == null) {
			// this variable is null if our data doesn't contain an entity for the requested
			// key
			// Throw suitable exception
			throw new ODataApplicationException("Entity for requested key doesn't exist",
					HttpStatusCode.NOT_FOUND.getStatusCode(), Locale.ENGLISH);
		}

		return requestedEntity;
	}

	
	
	/* HELPER */
	private void initSampleData() {

		// add some sample product entities
		final Entity e1 = new Entity().addProperty(new Property(null, "ID", ValueType.PRIMITIVE, 1))
				.addProperty(new Property(null, "Name", ValueType.PRIMITIVE, "Notebook Basic 15"))
				.addProperty(new Property(null, "Description", ValueType.PRIMITIVE,
						"Notebook Basic, 1.7GHz - 15 XGA - 1024MB DDR2 SDRAM - 40GB"));
		e1.setId(createId("Products", 1));
		productList.add(e1);

		final Entity e2 = new Entity().addProperty(new Property(null, "ID", ValueType.PRIMITIVE, 2))
				.addProperty(new Property(null, "Name", ValueType.PRIMITIVE, "1UMTS PDA"))
				.addProperty(new Property(null, "Description", ValueType.PRIMITIVE,
						"Ultrafast 3G UMTS/HSDPA Pocket PC, supports GSM network"));
		e2.setId(createId("Products", 1));
		productList.add(e2);

		final Entity e3 = new Entity().addProperty(new Property(null, "ID", ValueType.PRIMITIVE, 3))
				.addProperty(new Property(null, "Name", ValueType.PRIMITIVE, "Ergo Screen"))
				.addProperty(new Property(null, "Description", ValueType.PRIMITIVE,
						"19 Optimum Resolution 1024 x 768 @ 85Hz, resolution 1280 x 960"));
		e3.setId(createId("Products", 1));
		productList.add(e3);
	}

	private URI createId(String entitySetName, Object id) {
		try {
			return new URI(entitySetName + "(" + String.valueOf(id) + ")");
		} catch (URISyntaxException e) {
			throw new ODataRuntimeException("Unable to create id for entity: " + entitySetName, e);
		}
	}
}

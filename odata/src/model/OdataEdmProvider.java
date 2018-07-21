package model;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.apache.olingo.commons.api.edm.EdmPrimitiveTypeKind;
import org.apache.olingo.commons.api.edm.FullQualifiedName;
import org.apache.olingo.commons.api.edm.provider.CsdlAbstractEdmProvider;
import org.apache.olingo.commons.api.edm.provider.CsdlEntityContainer;
import org.apache.olingo.commons.api.edm.provider.CsdlEntityContainerInfo;
import org.apache.olingo.commons.api.edm.provider.CsdlEntitySet;
import org.apache.olingo.commons.api.edm.provider.CsdlEntityType;
import org.apache.olingo.commons.api.edm.provider.CsdlNavigationProperty;
import org.apache.olingo.commons.api.edm.provider.CsdlNavigationPropertyBinding;
import org.apache.olingo.commons.api.edm.provider.CsdlProperty;
import org.apache.olingo.commons.api.edm.provider.CsdlPropertyRef;
import org.apache.olingo.commons.api.edm.provider.CsdlSchema;
import org.apache.olingo.commons.api.ex.ODataException;
import org.smap.sdal.managers.EmailManager;
import org.smap.sdal.model.TableColumn;

import smapModels.SurveyModel;
import smapModels.SurveyNavigation;
import smapModels.SurveyForm;
import smapModels.PortalModel;
import util.Util;

public class OdataEdmProvider extends CsdlAbstractEdmProvider {

	String container_name;
	FullQualifiedName container; 		
	PortalModel model;
	String namespace;
	
	private static Logger log =
			Logger.getLogger(EmailManager.class.getName());

	public OdataEdmProvider(PortalModel model, String namespace, String container_name) {
		this.model = model;
		this.namespace = namespace;	
		this.container_name = container_name;
		this.container = new FullQualifiedName(namespace, container_name);
	}

	@Override
	public CsdlEntityContainer getEntityContainer() throws ODataException {

		// create EntitySets
		List<CsdlEntitySet> entitySets = new ArrayList<CsdlEntitySet>();
		for (String name : model.forms.keySet()) {
			entitySets.add(getEntitySet(container, name));
		}

		// create EntityContainer
		CsdlEntityContainer entityContainer = new CsdlEntityContainer();
		entityContainer.setName(container_name);
		entityContainer.setEntitySets(entitySets);

		return entityContainer;
	}

	@Override
	public CsdlEntityContainerInfo getEntityContainerInfo(FullQualifiedName entityContainerName) throws ODataException {
		// This method is invoked when displaying the Service Document at e.g.
		// http://localhost:8080/DemoService/DemoService.svc
		if (entityContainerName == null || entityContainerName.equals(container)) {
			CsdlEntityContainerInfo entityContainerInfo = new CsdlEntityContainerInfo();
			entityContainerInfo.setContainerName(container);
			return entityContainerInfo;
		}

		return null;
	}

	@Override
	public CsdlEntitySet getEntitySet(FullQualifiedName entityContainer, String entitySetName) throws ODataException {
		if (entityContainer.equals(container)) {
			SurveyForm f = model.forms.get(entitySetName);
			if (f != null) {
				CsdlEntitySet entitySet = new CsdlEntitySet();
				entitySet.setName(entitySetName);
				String et_name = Util.convertFormToEntityName(entitySetName);
				FullQualifiedName et_fqn = new FullQualifiedName(namespace, et_name);
				entitySet.setType(et_fqn);

				/*
				 * Set navigation bindings
				 */
				List<CsdlNavigationPropertyBinding> navPropBindingList = new ArrayList<CsdlNavigationPropertyBinding>();
				if(f.navigation.size() > 0) {
					for(SurveyNavigation sn : f.navigation) {
						CsdlNavigationPropertyBinding navPropBinding = new CsdlNavigationPropertyBinding();
						navPropBinding.setTarget(sn.name);//target entitySet, where the nav prop points to
						navPropBinding.setPath(sn.name); // the path from entity type to navigation property
						navPropBindingList.add(navPropBinding);
					}
				}
				if(navPropBindingList.size() > 0) {
					entitySet.setNavigationPropertyBindings(navPropBindingList);
				}
				
				return entitySet;
			}
		}

		return null;
	}

	@Override
	public CsdlEntityType getEntityType(FullQualifiedName entityTypeName) throws ODataException {
		// this method is called for one of the EntityTypes that are configured in the
		// Schema
		
		CsdlEntityType entityType = null;
		
		System.out.println("--------------Entity type name: " + entityTypeName.toString());
		if(entityTypeName.toString().equals("OData.Smap.visits")) {
			System.out.println("THis is it");
		}
		try {
			SurveyForm f = model.fqnForms.get(entityTypeName);
			if (f != null) {
	
				/*
				 * Get the column properties
				 */
				ArrayList<CsdlProperty> props = new ArrayList<> ();
				for(TableColumn tc : f.columns) {
					System.out.println("Add to model: " + tc.name + " : " + tc.type);
					
					// Defaults
					String name = tc.name;
					String csdlType = null;
								
					if(name.equals("prikey")) {
						name = "ID";
						csdlType = EdmPrimitiveTypeKind.Int32.getFullQualifiedName().toString();
					} else {
						csdlType = Util.getCsdlType(tc.type);
					}
									
					props.add(new CsdlProperty().setName(name).setType(csdlType));
					
				}
				
				/*
				 * Get the navigation properties
				 * 1 to many relationships
				 */
				List<CsdlNavigationProperty> navPropList = new ArrayList<CsdlNavigationProperty>();
				if(f.navigation.size() > 0) {
					System.out.println("================ Adding navigation for: " + f.name);
					for(SurveyNavigation sn : f.navigation) {
						System.out.println("xxx Nav: " + sn.name + " : " + 
								Util.convertFormToEntityName(sn.name) + " : " + Util.convertFormToEntityName(f.name));
						CsdlNavigationProperty navProp = new CsdlNavigationProperty()
	                            .setName(sn.name)
	                            .setType(new FullQualifiedName(namespace, Util.convertFormToEntityName(sn.name)))		// Entity type
	                            .setNullable(sn.nullable)
	                            .setCollection(true)
	                            .setPartner(Util.convertFormToEntityName(f.name));
						navPropList.add(navProp);
					}
				}
				
				// create CsdlPropertyRef for Key element
				CsdlPropertyRef propertyRef = new CsdlPropertyRef();
				propertyRef.setName("ID");
	
				// configure EntityType
				entityType = new CsdlEntityType();
				entityType.setName(Util.convertFormToEntityName(f.name));
				entityType.setProperties(props);
				entityType.setKey(Collections.singletonList(propertyRef));
				if(navPropList.size() > 0) {
					entityType.setNavigationProperties(navPropList);
				}
				
			}
		} catch (Exception e) {
			log.log(Level.SEVERE, e.getMessage(), e);
			throw e;
		}

		return entityType;
	}

	@Override
	public List<CsdlSchema> getSchemas() throws ODataException {
		
		List<CsdlSchema> schemas = new ArrayList<CsdlSchema>();
		
		try {
			// create Schema		
			CsdlSchema schema = new CsdlSchema();
			schema.setNamespace(namespace);
	
			// add EntityTypes
			List<CsdlEntityType> entityTypes = new ArrayList<CsdlEntityType>();
			for(FullQualifiedName fqn : model.fqnForms.keySet()) {
				entityTypes.add(getEntityType(fqn));
			}
			schema.setEntityTypes(entityTypes);
	
			// add EntityContainer
			schema.setEntityContainer(getEntityContainer());
	
			// finally
			schemas.add(schema);
		} catch(ODataException e) {
			log.log(Level.SEVERE, e.getMessage(), e);
			throw e;
		}

		return schemas;
	}

}
